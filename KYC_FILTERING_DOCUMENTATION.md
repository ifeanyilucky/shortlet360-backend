# KYC Filtering System Documentation

## Overview

The KYC (Know Your Customer) filtering system provides comprehensive filtering capabilities for admin users to manage and review user verification records. The system supports filtering by verification status, tier level, and search functionality.

## API Endpoints

### 1. Unified KYC Endpoint (Recommended)
```
GET /api/admin/kyc/all
```

This is the main endpoint that supports all filtering options with improved query logic.

### 2. Legacy Endpoints (Still Available)
```
GET /api/admin/kyc/pending  - Get pending KYC verifications
GET /api/admin/kyc/verified - Get verified KYC records
```

## Query Parameters

### Status Filter (`status`)
- **`all`** (default): Returns all KYC records regardless of status
- **`pending`**: Returns users with at least one pending tier verification
- **`verified`**: Returns users with at least one verified tier verification
- **`rejected`**: Returns users with at least one rejected tier verification

### Tier Filter (`tier`)
- **`1`**: Filter by Tier 1 verification (Email, Phone, NIN)
- **`2`**: Filter by Tier 2 verification (Identity documents, Address)
- **`3`**: Filter by Tier 3 verification (BVN, Bank account)

### Search Filter (`search`)
- Searches across multiple fields:
  - `first_name`
  - `last_name`
  - `email`
  - `short_id`
  - `phone_number`
- Case-insensitive partial matching

### Pagination
- **`page`** (default: 1): Page number
- **`limit`** (default: 10): Number of records per page

## Example API Calls

### 1. Get All KYC Records
```bash
GET /api/admin/kyc/all
```

### 2. Get Pending KYC Records
```bash
GET /api/admin/kyc/all?status=pending
```

### 3. Get Verified Tier 1 Records
```bash
GET /api/admin/kyc/all?tier=1&status=verified
```

### 4. Search for Users
```bash
GET /api/admin/kyc/all?search=john
```

### 5. Complex Filter
```bash
GET /api/admin/kyc/all?tier=2&status=pending&search=example.com&page=1&limit=20
```

## Response Format

```json
{
  "users": [
    {
      "_id": "user_id",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "user",
      "short_id": "USR123",
      "phone_number": "+1234567890",
      "kyc": {
        "tier1": {
          "status": "verified",
          "email_verified": true,
          "phone_verified": true,
          "nin_verified": true,
          "nin": "12345678901",
          "phone_verification_data": { ... },
          "nin_verification_data": { ... }
        },
        "tier2": {
          "status": "pending",
          "address": { ... },
          "identity": { ... }
        },
        "tier3": {
          "status": "not_started",
          "bvn": { ... },
          "bank_account": { ... }
        }
      }
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pages": 15,
    "limit": 10
  }
}
```

## Filter Logic

### Status + Tier Combination
When both `status` and `tier` are specified:
- The system filters for the specific tier with the specified status
- Example: `tier=1&status=pending` returns users with Tier 1 status = "pending"

### Status Only
When only `status` is specified:
- `pending`: Users with ANY tier having pending status
- `verified`: Users with ANY tier having verified status
- `rejected`: Users with ANY tier having rejected status

### Tier Only
When only `tier` is specified:
- Returns users who have data for that specific tier (regardless of status)

### Search Integration
- Search is combined with other filters using MongoDB `$and` operator
- Search works across all specified fields simultaneously

## Implementation Details

### Database Query Optimization
- Uses MongoDB aggregation for efficient filtering
- Proper indexing on frequently queried fields
- Pagination implemented at database level

### Error Handling
- Comprehensive error handling for invalid parameters
- Graceful fallback for malformed queries
- Detailed error messages for debugging

### Security
- Admin authentication required
- Input validation and sanitization
- Rate limiting applied

## Frontend Integration

The frontend should use the unified endpoint `/api/admin/kyc/all` with appropriate query parameters based on user selections in the filter UI.

### Example Frontend Service Call
```javascript
const getKycRecords = async (filters) => {
  const params = new URLSearchParams();
  
  if (filters.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }
  
  if (filters.tier) {
    params.append('tier', filters.tier);
  }
  
  if (filters.search) {
    params.append('search', filters.search);
  }
  
  params.append('page', filters.page || 1);
  params.append('limit', filters.limit || 10);
  
  return api.get(`/admin/kyc/all?${params.toString()}`);
};
```

## Testing

Use the provided test script `test-kyc-filtering.js` to verify all filtering combinations work correctly.

```bash
node test-kyc-filtering.js
```

## Performance Considerations

- Database indexes on `kyc.tier1.status`, `kyc.tier2.status`, `kyc.tier3.status`
- Indexes on search fields: `first_name`, `last_name`, `email`, `short_id`, `phone_number`
- Pagination limits to prevent large result sets
- Query optimization for complex filter combinations
