# Employee API Documentation

## Base URL
```
http://localhost:3004/api/employee
```

## Default Superadmin Credentials
```
Email: superadmin@gmail.com
Password: superadmin
```

## API Endpoints

### 1. Employee Register
**POST** `/api/employee/register`

**Request Body:**
```json
{
  "employee_id": "EMP002",
  "department": "IT",
  "designation": "Developer",
  "qualification": "B.Tech",
  "work_exp": "2 years",
  "name": "John",
  "surname": "Doe",
  "father_name": "Father Name",
  "mother_name": "Mother Name",
  "contact_no": "1234567890",
  "emeregency_contact_no": "9876543210",
  "email": "john@example.com",
  "dob": "1995-01-01",
  "marital_status": "Single",
  "date_of_joining": "2024-01-01",
  "local_address": "Local Address",
  "permanent_address": "Permanent Address",
  "password": "password123",
  "gender": "Male",
  "acount_title": "John Doe",
  "bank_account_no": "1234567890",
  "bank_name": "Bank Name",
  "ifsc_code": "BANK0001234",
  "bank_branch": "Branch Name",
  "payscale": "Grade A",
  "basic_salary": "50000",
  "epf_no": "EPF123456",
  "contract_type": "Permanent",
  "shift": "Day",
  "location": "Head Office",
  "is_superadmin": 0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Employee registered successfully",
  "employee_id": 2
}
```

---

### 2. Employee Login
**POST** `/api/employee/login`

**Request Body:**
```json
{
  "email": "superadmin@gmail.com",
  "password": "superadmin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "employee": {
    "id": 1,
    "employee_id": "EMP001",
    "name": "Super",
    "surname": "Admin",
    "email": "superadmin@gmail.com",
    "department": "Administration",
    "designation": "Super Admin",
    "is_superadmin": 1
  }
}
```

---

### 3. Get Employee Profile (Protected)
**GET** `/api/employee/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "employee": {
    "id": 1,
    "employee_id": "EMP001",
    "name": "Super",
    "surname": "Admin",
    "email": "superadmin@gmail.com",
    "department": "Administration",
    "designation": "Super Admin",
    "is_superadmin": 1,
    ...
  }
}
```

---

## Testing with cURL

### Login as Superadmin
```bash
curl -X POST http://localhost:3004/api/employee/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"superadmin@gmail.com\",\"password\":\"superadmin\"}"
```

### Get Profile
```bash
curl -X GET http://localhost:3004/api/employee/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Notes
- Default superadmin is automatically created when you run `npm run migrate`
- JWT token expires in 24 hours
- Password is hashed using bcryptjs before storing
- JWT_SECRET can be changed in `.env` file
