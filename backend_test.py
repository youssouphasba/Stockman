#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Stock Management System
Tests all endpoints with realistic French data
"""

import requests
import json
import sys
from datetime import datetime
import uuid

# Backend URL from frontend .env
BACKEND_URL = "https://vendorlink-31.preview.emergentagent.com/api"

class StockAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = None
        self.test_results = []
        self.created_resources = {
            'categories': [],
            'products': [],
            'movements': [],
            'alerts': []
        }
    
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            'test': test_name,
            'status': status,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        }
        self.test_results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method, endpoint, data=None, headers=None):
        """Make HTTP request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Add auth header if we have a token
        if self.auth_token and headers is None:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
        elif self.auth_token and headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=headers)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method.upper() == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            return None, str(e)
    
    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n=== Testing Health Endpoints ===")
        
        # Test root endpoint
        response = self.make_request('GET', '/')
        if response and response.status_code == 200:
            self.log_result("Root Endpoint", True, "API root accessible")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Root Endpoint", False, "API root not accessible", error)
        
        # Test health endpoint
        response = self.make_request('GET', '/health')
        if response and response.status_code == 200:
            self.log_result("Health Check", True, "Health endpoint working")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Health Check", False, "Health endpoint failed", error)
    
    def test_user_registration(self):
        """Test user registration"""
        print("\n=== Testing User Registration ===")
        
        # Generate unique email for testing
        test_email = f"test.user.{uuid.uuid4().hex[:8]}@example.com"
        
        user_data = {
            "email": test_email,
            "password": "MotDePasse123!",
            "name": "Jean Dupont"
        }
        
        response = self.make_request('POST', '/auth/register', user_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data and 'user' in data:
                self.auth_token = data['access_token']
                self.user_data = data['user']
                self.log_result("User Registration", True, f"User registered successfully: {data['user']['name']}")
                return True
            else:
                self.log_result("User Registration", False, "Invalid response format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("User Registration", False, "Registration failed", error)
        
        return False
    
    def test_user_login(self):
        """Test user login with existing credentials"""
        print("\n=== Testing User Login ===")
        
        if not self.user_data:
            self.log_result("User Login", False, "No user data available for login test")
            return False
        
        login_data = {
            "email": self.user_data['email'],
            "password": "MotDePasse123!"
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'access_token' in data:
                self.log_result("User Login", True, "Login successful")
                return True
            else:
                self.log_result("User Login", False, "Invalid login response", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("User Login", False, "Login failed", error)
        
        return False
    
    def test_get_current_user(self):
        """Test getting current user info"""
        print("\n=== Testing Get Current User ===")
        
        response = self.make_request('GET', '/auth/me')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'user_id' in data and 'email' in data:
                self.log_result("Get Current User", True, f"User info retrieved: {data['name']}")
                return True
            else:
                self.log_result("Get Current User", False, "Invalid user data format", data)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get Current User", False, "Failed to get user info", error)
        
        return False
    
    def test_categories_crud(self):
        """Test category CRUD operations"""
        print("\n=== Testing Categories CRUD ===")
        
        # Test create category
        category_data = {
            "name": "Électronique",
            "color": "#3B82F6",
            "icon": "laptop-outline"
        }
        
        response = self.make_request('POST', '/categories', category_data)
        
        if response and response.status_code == 200:
            category = response.json()
            self.created_resources['categories'].append(category['category_id'])
            self.log_result("Create Category", True, f"Category created: {category['name']}")
            
            # Test get categories
            response = self.make_request('GET', '/categories')
            if response and response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    self.log_result("Get Categories", True, f"Retrieved {len(categories)} categories")
                else:
                    self.log_result("Get Categories", False, "No categories returned")
            
            # Test update category
            update_data = {
                "name": "Électronique & Informatique",
                "color": "#10B981"
            }
            response = self.make_request('PUT', f'/categories/{category["category_id"]}', update_data)
            if response and response.status_code == 200:
                self.log_result("Update Category", True, "Category updated successfully")
            else:
                error = response.text if response else "Connection failed"
                self.log_result("Update Category", False, "Failed to update category", error)
            
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Create Category", False, "Failed to create category", error)
    
    def test_products_crud(self):
        """Test product CRUD operations"""
        print("\n=== Testing Products CRUD ===")
        
        # Create products with different stock levels
        products_data = [
            {
                "name": "Ordinateur Portable Dell",
                "description": "Laptop professionnel 15 pouces",
                "sku": "DELL-LAP-001",
                "quantity": 5,
                "unit": "pièce",
                "purchase_price": 800.00,
                "selling_price": 1200.00,
                "min_stock": 2,
                "max_stock": 20
            },
            {
                "name": "Souris Sans Fil",
                "description": "Souris ergonomique Bluetooth",
                "sku": "MOUSE-BT-001", 
                "quantity": 0,  # Out of stock
                "unit": "pièce",
                "purchase_price": 25.00,
                "selling_price": 45.00,
                "min_stock": 5,
                "max_stock": 50
            },
            {
                "name": "Câbles USB-C",
                "description": "Câbles de charge USB-C 2m",
                "sku": "CABLE-USBC-2M",
                "quantity": 1,  # Low stock
                "unit": "pièce", 
                "purchase_price": 8.00,
                "selling_price": 15.00,
                "min_stock": 10,
                "max_stock": 100
            },
            {
                "name": "Écrans 24 pouces",
                "description": "Moniteurs LED Full HD",
                "sku": "MONITOR-24-FHD",
                "quantity": 25,  # Overstock
                "unit": "pièce",
                "purchase_price": 150.00,
                "selling_price": 250.00,
                "min_stock": 3,
                "max_stock": 15
            }
        ]
        
        created_products = []
        
        for product_data in products_data:
            response = self.make_request('POST', '/products', product_data)
            
            if response and response.status_code == 200:
                product = response.json()
                created_products.append(product)
                self.created_resources['products'].append(product['product_id'])
                self.log_result("Create Product", True, f"Product created: {product['name']} (Stock: {product['quantity']})")
            else:
                error = response.text if response else "Connection failed"
                self.log_result("Create Product", False, f"Failed to create product: {product_data['name']}", error)
        
        if created_products:
            # Test get all products
            response = self.make_request('GET', '/products')
            if response and response.status_code == 200:
                products = response.json()
                self.log_result("Get Products", True, f"Retrieved {len(products)} products")
            
            # Test get single product
            test_product = created_products[0]
            response = self.make_request('GET', f'/products/{test_product["product_id"]}')
            if response and response.status_code == 200:
                product = response.json()
                self.log_result("Get Single Product", True, f"Retrieved product: {product['name']}")
            
            # Test update product
            update_data = {
                "quantity": 10,
                "selling_price": 1300.00
            }
            response = self.make_request('PUT', f'/products/{test_product["product_id"]}', update_data)
            if response and response.status_code == 200:
                self.log_result("Update Product", True, "Product updated successfully")
            else:
                error = response.text if response else "Connection failed"
                self.log_result("Update Product", False, "Failed to update product", error)
    
    def test_stock_movements(self):
        """Test stock movement operations"""
        print("\n=== Testing Stock Movements ===")
        
        if not self.created_resources['products']:
            self.log_result("Stock Movements", False, "No products available for stock movement test")
            return
        
        product_id = self.created_resources['products'][0]
        
        # Test stock in movement
        movement_in = {
            "product_id": product_id,
            "type": "in",
            "quantity": 5,
            "reason": "Réapprovisionnement fournisseur"
        }
        
        response = self.make_request('POST', '/stock/movement', movement_in)
        if response and response.status_code == 200:
            movement = response.json()
            self.created_resources['movements'].append(movement['movement_id'])
            self.log_result("Stock In Movement", True, f"Stock increased by {movement['quantity']}")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Stock In Movement", False, "Failed to create stock in movement", error)
        
        # Test stock out movement
        movement_out = {
            "product_id": product_id,
            "type": "out", 
            "quantity": 2,
            "reason": "Vente client"
        }
        
        response = self.make_request('POST', '/stock/movement', movement_out)
        if response and response.status_code == 200:
            movement = response.json()
            self.created_resources['movements'].append(movement['movement_id'])
            self.log_result("Stock Out Movement", True, f"Stock decreased by {movement['quantity']}")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Stock Out Movement", False, "Failed to create stock out movement", error)
        
        # Test get movements
        response = self.make_request('GET', '/stock/movements')
        if response and response.status_code == 200:
            movements = response.json()
            self.log_result("Get Stock Movements", True, f"Retrieved {len(movements)} movements")
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get Stock Movements", False, "Failed to get movements", error)
    
    def test_alerts(self):
        """Test alerts functionality"""
        print("\n=== Testing Alerts ===")
        
        # Get alerts (should be auto-created from products with low/no stock)
        response = self.make_request('GET', '/alerts')
        if response and response.status_code == 200:
            alerts = response.json()
            self.log_result("Get Alerts", True, f"Retrieved {len(alerts)} alerts")
            
            if alerts:
                # Test mark alert as read
                alert_id = alerts[0]['alert_id']
                response = self.make_request('PUT', f'/alerts/{alert_id}/read')
                if response and response.status_code == 200:
                    self.log_result("Mark Alert Read", True, "Alert marked as read")
                else:
                    error = response.text if response else "Connection failed"
                    self.log_result("Mark Alert Read", False, "Failed to mark alert as read", error)
                
                # Test dismiss alert
                if len(alerts) > 1:
                    alert_id = alerts[1]['alert_id']
                    response = self.make_request('PUT', f'/alerts/{alert_id}/dismiss')
                    if response and response.status_code == 200:
                        self.log_result("Dismiss Alert", True, "Alert dismissed")
                    else:
                        error = response.text if response else "Connection failed"
                        self.log_result("Dismiss Alert", False, "Failed to dismiss alert", error)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get Alerts", False, "Failed to get alerts", error)
    
    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n=== Testing Dashboard ===")
        
        response = self.make_request('GET', '/dashboard')
        if response and response.status_code == 200:
            dashboard = response.json()
            required_fields = ['total_products', 'total_stock_value', 'potential_revenue', 
                             'critical_count', 'overstock_count', 'low_stock_count', 
                             'out_of_stock_count', 'unread_alerts']
            
            missing_fields = [field for field in required_fields if field not in dashboard]
            
            if not missing_fields:
                self.log_result("Dashboard Data", True, 
                               f"Dashboard complete - Products: {dashboard['total_products']}, "
                               f"Value: €{dashboard['total_stock_value']}, "
                               f"Alerts: {dashboard['unread_alerts']}")
            else:
                self.log_result("Dashboard Data", False, f"Missing fields: {missing_fields}", dashboard)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Dashboard Data", False, "Failed to get dashboard data", error)
    
    def test_settings(self):
        """Test settings endpoints"""
        print("\n=== Testing Settings ===")
        
        # Get settings
        response = self.make_request('GET', '/settings')
        if response and response.status_code == 200:
            settings = response.json()
            self.log_result("Get Settings", True, f"Settings retrieved - Language: {settings.get('language', 'N/A')}")
            
            # Test update settings
            update_data = {
                "simple_mode": False,
                "push_notifications": False,
                "language": "fr"
            }
            
            response = self.make_request('PUT', '/settings', update_data)
            if response and response.status_code == 200:
                self.log_result("Update Settings", True, "Settings updated successfully")
            else:
                error = response.text if response else "Connection failed"
                self.log_result("Update Settings", False, "Failed to update settings", error)
        else:
            error = response.text if response else "Connection failed"
            self.log_result("Get Settings", False, "Failed to get settings", error)
    
    def test_logout(self):
        """Test user logout"""
        print("\n=== Testing Logout ===")
        
        response = self.make_request('POST', '/auth/logout')
        if response and response.status_code == 200:
            self.log_result("User Logout", True, "Logout successful")
            self.auth_token = None
        else:
            error = response.text if response else "Connection failed"
            self.log_result("User Logout", False, "Logout failed", error)
    
    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Stock Management API Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Test sequence
        self.test_health_check()
        
        if self.test_user_registration():
            self.test_user_login()
            self.test_get_current_user()
            self.test_categories_crud()
            self.test_products_crud()
            self.test_stock_movements()
            self.test_alerts()
            self.test_dashboard()
            self.test_settings()
            self.test_logout()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = len([r for r in self.test_results if "✅ PASS" in r['status']])
        failed = len([r for r in self.test_results if "❌ FAIL" in r['status']])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if "❌ FAIL" in result['status']:
                    print(f"  • {result['test']}: {result['message']}")
        
        print("\n" + "=" * 60)
        
        return failed == 0

if __name__ == "__main__":
    tester = StockAPITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)