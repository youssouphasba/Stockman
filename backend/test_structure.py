from fastapi import FastAPI, APIRouter

def test_router_structure():
    app = FastAPI()
    api_router = APIRouter(prefix="/api")
    admin_router = APIRouter(prefix="/admin")

    @admin_router.post("/cgu")
    def update_cgu():
        return {"msg": "ok"}

    # Simulate what we have in server.py
    # api_router is included in app
    app.include_router(api_router)
    # admin_router is included in app with prefix /api
    app.include_router(admin_router, prefix="/api")

    print("=== TEST ROUTES ===")
    found = False
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"{route.methods} {route.path}")
            if route.path == "/api/admin/cgu" and "POST" in route.methods:
                found = True
    
    if found:
        print("SUCCESS: /api/admin/cgu exists")
    else:
        print("FAILURE: /api/admin/cgu NOT found")

if __name__ == "__main__":
    test_router_structure()
