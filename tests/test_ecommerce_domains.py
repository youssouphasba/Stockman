import asyncio
import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from ecommerce_addresses import DomainInputError, expected_records, normalize_ecommerce_slug, parse_domain_input  # noqa: E402
from ecommerce_domains import (  # noqa: E402
    ACTIVATION_PENDING,
    ACTIVE,
    CERTIFICATE_PENDING,
    DNS_PENDING,
    NOT_CONNECTED,
    OWNERSHIP_PENDING,
    DomainServiceError,
    EcommerceDomainService,
    HostingError,
    VercelDomains,
    compute_state,
    recommended_value,
    stockman_answers,
)
from fake_mongo import FakeDatabase  # noqa: E402

# Domaines techniques de test, jamais affichés par l'application.
VERCEL_IP = "76.76.21.21"


def run(coro):
    return asyncio.run(coro)


class Clock:
    def __init__(self):
        self.now = datetime(2026, 11, 8, 20, 0, tzinfo=timezone.utc)

    def __call__(self):
        self.now += timedelta(seconds=1)
        return self.now


class Network:
    """Résolution DNS et réponses HTTPS simulées pour les contrôles."""

    def __init__(self):
        self.dns = {"cname.vercel-dns.com": {VERCEL_IP}}
        self.answering = set()
        self.probed = []

    async def resolve(self, host):
        return set(self.dns.get(host, set()))

    async def probe(self, host):
        self.probed.append(host)
        return host in self.answering


class FakeVercel:
    def __init__(self):
        self.domains = {}
        self.calls = []
        self.misconfigured = {}
        self.verification = {}
        self.fail_attach = {}
        self.unreachable = False

    def _guard(self):
        if self.unreachable:
            raise HostingError("hosting_unreachable", "indisponible")

    async def attach(self, host, redirect_to=None):
        self._guard()
        self.calls.append(("attach", host, redirect_to))
        if host in self.fail_attach:
            raise HostingError(self.fail_attach[host], "refus")
        self.domains[host] = {"name": host, "redirect": redirect_to, "verified": host not in self.verification}
        return self.domains[host]

    async def project_domain(self, host):
        self._guard()
        domain = self.domains.get(host)
        if domain and host in self.verification:
            return {**domain, "verified": False, "verification": [self.verification[host]]}
        return domain

    async def verify(self, host):
        self._guard()
        self.calls.append(("verify", host))
        return None

    async def config(self, host):
        self._guard()
        return {"misconfigured": self.misconfigured.get(host, True), "recommendedCNAME": [{"rank": 1, "value": "abc123.vercel-dns-017.com."}], "recommendedIPv4": [{"rank": 1, "value": [VERCEL_IP]}]}

    async def detach(self, host):
        self.calls.append(("detach", host))
        self.domains.pop(host, None)


class AddressTests(unittest.TestCase):
    def test_slug_keeps_accented_letters_readable(self):
        self.assertEqual(normalize_ecommerce_slug("Épicerie Senlab"), "epicerie-senlab")
        self.assertEqual(normalize_ecommerce_slug("Café Ndèye & Fils"), "cafe-ndeye-fils")
        self.assertEqual(normalize_ecommerce_slug("Œuvres d'Été"), "oeuvres-d-ete")
        self.assertEqual(normalize_ecommerce_slug("senlab"), "senlab")
        self.assertEqual(normalize_ecommerce_slug("  --  "), "boutique")
        self.assertEqual(normalize_ecommerce_slug("A"), "boutique-a")
        long_slug = normalize_ecommerce_slug("Boutique " + "très longue " * 10)
        self.assertLessEqual(len(long_slug), 50)
        self.assertFalse(long_slug.endswith("-"))

    def test_domain_input_connects_www_and_redirects_the_bare_domain(self):
        for value in ("senlab.com", "WWW.Senlab.com", "https://www.senlab.com/boutique?x=1", "senlab.com."):
            target = parse_domain_input(value)
            self.assertEqual((target.host, target.apex, target.redirect_from), ("www.senlab.com", "senlab.com", "senlab.com"), value)
        sub = parse_domain_input("boutique.senlab.com")
        self.assertEqual((sub.host, sub.apex, sub.redirect_from), ("boutique.senlab.com", "senlab.com", None))
        local = parse_domain_input("maboutique.com.sn")
        self.assertEqual((local.host, local.redirect_from), ("www.maboutique.com.sn", "maboutique.com.sn"))
        idn = parse_domain_input("épicerie.sn")
        self.assertEqual(idn.redirect_from, "épicerie".encode("idna").decode("ascii") + ".sn")
        for value, code in (("", "empty"), ("senlab", "invalid"), ("com.sn", "incomplete"), ("app.stockman.pro", "reserved"),
                            ("site.vercel.app", "reserved"), ("192.168.0.1", "invalid"), ("sen lab.com", "invalid"), ("-x.com", "invalid")):
            with self.assertRaises(DomainInputError) as ctx:
                parse_domain_input(value)
            self.assertEqual(ctx.exception.code, code, value)

    def test_records_are_given_in_reading_order(self):
        records = expected_records(parse_domain_input("senlab.com"), "cname.vercel-dns.com", VERCEL_IP)
        self.assertEqual([(r["type"], r["name"], r["value"], r["purpose"]) for r in records], [
            ("CNAME", "www", "cname.vercel-dns.com", "site"), ("A", "@", VERCEL_IP, "redirect"),
        ])
        self.assertEqual([r["name"] for r in expected_records(parse_domain_input("boutique.senlab.com"), "t", VERCEL_IP)], ["boutique"])

    def test_state_order_and_hosting_values(self):
        self.assertEqual(compute_state(automatic=True, dns_ok=False, ownership_ok=False, https_ok=False), OWNERSHIP_PENDING)
        self.assertEqual(compute_state(automatic=True, dns_ok=False, ownership_ok=True, https_ok=False), DNS_PENDING)
        self.assertEqual(compute_state(automatic=True, dns_ok=True, ownership_ok=True, https_ok=False), CERTIFICATE_PENDING)
        self.assertEqual(compute_state(automatic=False, dns_ok=True, ownership_ok=True, https_ok=False), ACTIVATION_PENDING)
        self.assertEqual(compute_state(automatic=False, dns_ok=True, ownership_ok=True, https_ok=True), ACTIVE)
        self.assertEqual(recommended_value({"recommendedCNAME": [{"rank": 2, "value": "b.com"}, {"rank": 1, "value": "a.com."}]}, "recommendedCNAME"), "a.com")
        self.assertEqual(recommended_value({"recommendedIPv4": [{"rank": 1, "value": ["1.2.3.4"]}]}, "recommendedIPv4"), "1.2.3.4")
        self.assertIsNone(recommended_value({}, "recommendedCNAME"))


class ManualHostingTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.net = Network()
        self.service = EcommerceDomainService(self.db, resolver=self.net.resolve, probe=self.net.probe, clock=Clock(), cname_target="cname.vercel-dns.com", apex_ipv4=VERCEL_IP)
        run(self.db.business_accounts.insert_one({"account_id": "acc_a", "ecommerce_slug": "senlab"}))
        run(self.db.business_accounts.insert_one({"account_id": "acc_b", "ecommerce_slug": "autre", "ecommerce_custom_domain": "www.autre-boutique.com", "ecommerce_domain_aliases": ["autre-boutique.com"]}))

    def account(self):
        return self.db.business_accounts.docs[0]

    def test_connection_goes_from_dns_to_online(self):
        run(self.service.connect(self.account(), "senlab.com"))
        account = self.account()
        self.assertEqual((account["ecommerce_custom_domain"], account["ecommerce_domain_aliases"]), ("www.senlab.com", ["senlab.com"]))
        self.assertEqual((account["ecommerce_domain_state"], account["ecommerce_domain_status"]), (DNS_PENDING, "pending_verification"))
        self.assertEqual(len(account["ecommerce_domain_records"]), 2)
        self.assertEqual(self.net.probed, [])

        self.net.dns.update({"www.senlab.com": {VERCEL_IP}, "senlab.com": {VERCEL_IP}})
        run(self.service.check(self.account()))
        # Sans pilotage de l'hébergeur, Stockman doit encore activer le domaine.
        self.assertEqual(self.account()["ecommerce_domain_state"], ACTIVATION_PENDING)
        self.net.answering.add("www.senlab.com")
        run(self.service.check(self.account()))
        account = self.account()
        self.assertEqual((account["ecommerce_domain_state"], account["ecommerce_domain_status"]), (ACTIVE, "verified"))
        self.assertTrue(account["ecommerce_domain_redirect_ready"])
        self.assertIsNotNone(account["ecommerce_domain_verified_at"])
        described = self.service.describe(account)
        self.assertEqual((described["domain_state"], described["domain_redirect_from"], described["domain_automatic"]), (ACTIVE, "senlab.com", False))

    def test_taken_domains_invalid_input_and_private_addresses_are_refused(self):
        for value in ("autre-boutique.com", "www.autre-boutique.com"):
            with self.assertRaises(DomainServiceError) as ctx:
                run(self.service.connect(self.account(), value))
            self.assertEqual((ctx.exception.status, ctx.exception.code), (409, "domain_taken"))
        with self.assertRaises(DomainServiceError) as ctx:
            run(self.service.connect(self.account(), "pas un domaine"))
        self.assertEqual(ctx.exception.status, 400)
        self.assertNotIn("ecommerce_custom_domain", self.account())
        # Une adresse privée n'est jamais contactée, même si elle correspond à la cible.
        self.net.dns.update({"cname.vercel-dns.com": {"10.0.0.5"}, "www.senlab.com": {"10.0.0.5"}})
        run(self.service.connect(self.account(), "senlab.com"))
        self.assertEqual(self.account()["ecommerce_domain_state"], ACTIVATION_PENDING)
        self.assertEqual(self.net.probed, [])

    def test_disconnecting_returns_to_the_stockman_address(self):
        run(self.service.connect(self.account(), "boutique.senlab.com"))
        self.assertIsNone(self.account()["ecommerce_domain_redirect_ready"])
        run(self.service.disconnect(self.account()))
        account = self.account()
        self.assertEqual((account["ecommerce_custom_domain"], account["ecommerce_domain_state"], account["ecommerce_domain_status"]), (None, NOT_CONNECTED, "not_configured"))
        self.assertEqual(self.service.describe(account)["domain_state"], NOT_CONNECTED)

    def test_domains_connected_before_this_flow_keep_working(self):
        legacy = {"account_id": "acc_old", "ecommerce_custom_domain": "www.ancienne.com", "ecommerce_domain_status": "verified"}
        described = self.service.describe(legacy)
        self.assertEqual(described["domain_state"], ACTIVE)
        self.assertEqual([record["name"] for record in described["domain_records"]], ["www"])
        self.assertTrue(all("\u00c3" not in step for step in described["domain_connection_steps"]))
        # Les anciennes consignes visaient l'adresse de l'application : elles restent acceptées.
        service = EcommerceDomainService(self.db, resolver=self.net.resolve, probe=self.net.probe, clock=Clock(), legacy_target="app.stockman.pro")
        run(self.db.business_accounts.insert_one(legacy))
        self.net.dns.update({"app.stockman.pro": {"66.33.60.1"}, "www.ancienne.com": {"66.33.60.1"}})
        self.net.answering.add("www.ancienne.com")
        run(service.check(self.db.business_accounts.docs[-1]))
        self.assertEqual(self.db.business_accounts.docs[-1]["ecommerce_domain_state"], ACTIVE)


class AutomaticHostingTests(unittest.TestCase):
    def setUp(self):
        self.db = FakeDatabase()
        self.net = Network()
        self.vercel = FakeVercel()
        self.service = EcommerceDomainService(self.db, hosting=self.vercel, resolver=self.net.resolve, probe=self.net.probe, clock=Clock(), cname_target="cname.vercel-dns.com", apex_ipv4=VERCEL_IP)
        run(self.db.business_accounts.insert_one({"account_id": "acc_a", "ecommerce_slug": "senlab"}))

    def account(self):
        return self.db.business_accounts.docs[0]

    def test_the_domain_is_registered_with_the_host_and_checked_step_by_step(self):
        run(self.service.connect(self.account(), "senlab.com"))
        self.assertIn(("attach", "www.senlab.com", None), self.vercel.calls)
        self.assertIn(("attach", "senlab.com", "www.senlab.com"), self.vercel.calls)
        account = self.account()
        self.assertEqual(account["ecommerce_domain_state"], DNS_PENDING)
        # Les valeurs recommandées par l'hébergeur remplacent les valeurs par défaut.
        self.assertEqual(account["ecommerce_domain_records"][0]["value"], "abc123.vercel-dns-017.com")

        self.vercel.misconfigured.update({"www.senlab.com": False, "senlab.com": False})
        self.net.dns["www.senlab.com"] = {VERCEL_IP}
        run(self.service.check(self.account()))
        self.assertEqual(self.account()["ecommerce_domain_state"], CERTIFICATE_PENDING)
        self.net.answering.add("www.senlab.com")
        run(self.service.check(self.account()))
        self.assertEqual(self.account()["ecommerce_domain_state"], ACTIVE)
        self.assertTrue(self.service.describe(self.account())["domain_automatic"])

        run(self.service.disconnect(self.account()))
        self.assertIn(("detach", "www.senlab.com"), self.vercel.calls)
        self.assertIn(("detach", "senlab.com"), self.vercel.calls)

    def test_ownership_proof_is_shown_when_the_host_asks_for_it(self):
        self.vercel.verification["www.senlab.com"] = {"type": "TXT", "domain": "_vercel.senlab.com", "value": "vc-domain-verify=www.senlab.com,abc", "reason": "pending_domain_verification"}
        run(self.service.connect(self.account(), "senlab.com"))
        account = self.account()
        self.assertEqual(account["ecommerce_domain_state"], OWNERSHIP_PENDING)
        txt = [record for record in account["ecommerce_domain_records"] if record["purpose"] == "ownership"]
        self.assertEqual([(record["type"], record["name"]) for record in txt], [("TXT", "_vercel")])
        self.assertIn(("verify", "www.senlab.com"), self.vercel.calls)

    def test_refusals_leave_the_account_unchanged_and_outages_fall_back_to_dns(self):
        self.vercel.fail_attach["senlab.com"] = "domain_in_use"
        with self.assertRaises(DomainServiceError) as ctx:
            run(self.service.connect(self.account(), "senlab.com"))
        self.assertEqual((ctx.exception.status, ctx.exception.code), (409, "domain_in_use"))
        self.assertIn(("detach", "www.senlab.com"), self.vercel.calls)
        self.assertNotIn("ecommerce_custom_domain", self.account())

        del self.vercel.fail_attach["senlab.com"]
        run(self.service.connect(self.account(), "senlab.com"))
        self.vercel.unreachable = True
        self.net.dns.update({"www.senlab.com": {VERCEL_IP}, "senlab.com": {VERCEL_IP}})
        self.net.answering.add("www.senlab.com")
        run(self.service.check(self.account()))
        self.assertEqual(self.account()["ecommerce_domain_state"], ACTIVE)

    def test_a_domain_connected_by_hand_is_registered_at_the_next_check(self):
        run(self.db.business_accounts.insert_one({"account_id": "acc_old", "ecommerce_custom_domain": "www.ancienne.com", "ecommerce_domain_status": "pending_verification"}))
        run(self.service.check(self.db.business_accounts.docs[-1]))
        self.assertIn(("attach", "www.ancienne.com", None), self.vercel.calls)
        self.assertEqual(self.db.business_accounts.docs[-1]["ecommerce_domain_hosting"], "vercel")


class FakeResponse:
    def __init__(self, status_code, data=None):
        self.status_code = status_code
        self._data = data
        self.content = b"x" if data is not None else b""

    def json(self):
        return self._data


class FakeClient:
    def __init__(self, responses, sent, **kwargs):
        self.responses = responses
        self.sent = sent
        self.kwargs = kwargs

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def request(self, method, path, params=None, json=None, headers=None):
        self.sent.append((method, path, params, json, headers))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response

    async def get(self, url, headers=None):
        self.sent.append(("GET", url, None, None, headers))
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


class VercelApiTests(unittest.TestCase):
    def client(self, responses, sent):
        return lambda **kwargs: FakeClient(responses, sent, **kwargs)

    def test_requests_carry_the_token_team_and_project(self):
        sent = []
        api = VercelDomains("jeton", "prj_1", "team_1", client_factory=self.client([FakeResponse(200, {"name": "senlab.com"})], sent))
        run(api.attach("senlab.com", redirect_to="www.senlab.com"))
        method, path, params, body, headers = sent[0]
        self.assertEqual((method, path), ("POST", "/v10/projects/prj_1/domains"))
        self.assertEqual(params, {"teamId": "team_1"})
        self.assertEqual(body, {"name": "senlab.com", "redirect": "www.senlab.com", "redirectStatusCode": 308})
        self.assertEqual(headers, {"Authorization": "Bearer jeton"})

    def test_conflicts_and_outages_become_clear_errors(self):
        sent = []
        api = VercelDomains("jeton", "prj_1", client_factory=self.client([FakeResponse(409, {"error": {"code": "domain_already_in_use"}}), FakeResponse(200, {"name": "www.senlab.com", "verified": True})], sent))
        self.assertTrue(run(api.attach("www.senlab.com"))["verified"])
        api = VercelDomains("jeton", "prj_1", client_factory=self.client([FakeResponse(409, {"error": {"code": "domain_already_in_use"}}), FakeResponse(404, {})], sent))
        with self.assertRaises(HostingError) as ctx:
            run(api.attach("www.senlab.com"))
        self.assertEqual(ctx.exception.code, "domain_in_use")
        api = VercelDomains("jeton", "prj_1", client_factory=self.client([ConnectionError("hors ligne")], sent))
        with self.assertRaises(HostingError) as ctx:
            run(api.config("www.senlab.com"))
        self.assertEqual(ctx.exception.code, "hosting_unreachable")
        self.assertIsNone(VercelDomains.from_env({"VERCEL_PROJECT_ID": "prj_1"}))
        self.assertEqual(VercelDomains.from_env({"VERCEL_API_TOKEN": "t", "VERCEL_PROJECT_ID": "p"}).team_id, None)

    def test_only_the_stockman_answer_proves_the_domain_is_online(self):
        sent = []
        factory = self.client([FakeResponse(200, {"service": "stockman"}), FakeResponse(200, {"autre": True}), ConnectionError("certificat")], sent)
        self.assertTrue(run(stockman_answers("www.senlab.com", client_factory=factory)))
        self.assertFalse(run(stockman_answers("www.senlab.com", client_factory=factory)))
        self.assertFalse(run(stockman_answers("www.senlab.com", client_factory=factory)))
        self.assertEqual(sent[0][1], "https://www.senlab.com/api/public/ecommerce/_domain-check")


if __name__ == "__main__":
    unittest.main()
