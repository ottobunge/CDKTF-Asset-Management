# Asset Management with AWS Secrets Manager

This project demonstrates a secure approach to managing sensitive dependencies using AWS CDK for Terraform (CDKTF) and AWS Secrets Manager. It enables organizations to implement a separation of concerns between teams that manage secrets and teams that develop applications.

## Overview

The system consists of two main components:

1. **DependencyStack**: Used by security/ops teams to safely store sensitive configuration data (like database credentials, API keys, etc.) in AWS Secrets Manager.
2. **Application Stack**: Used by development teams to access these secrets without direct exposure to the sensitive values.

## Security Benefits

- Developers don't need direct access to sensitive credentials
- Reduced risk of secret leakage through developer environments
- Centralized secret management
- Integration with AWS IAM for access control
- Audit trail through AWS CloudTrail

## Prerequisites

- Node.js (14.x or later)
- AWS CLI configured with appropriate credentials
- Terraform CLI
- CDKTF CLI

## Environment Variables

The following environment variables are required:
```
AWS_ACCOUNT_ID=your-aws-account-id
AWS_REGION=your-aws-region
BACKEND_BUCKET=your-terraform-state-bucket
INSTALL_DEPENDENCIES=true|false
```
## Project Structure

```
AssetManagement/
├── src/
│ ├── lib/
│ │ ├── BaseStack/ # Base infrastructure stack
│ │ └── DependencyStack/ # Secret management stack
│ └── main.ts # Main application entry point
```

## Usage

### For Security/Operations Teams

1. Set up the dependencies by running with `INSTALL_DEPENDENCIES=true`:

```
{
    "assetId": {
    "DATABASE": {
        "url": "https://example.com",
        "username": "admin",
        "password": "password"
    },
    "SENTRY": {
        "dsn": "https://example.com"
    }
    }
}
```

2. Access secrets in your code:
```
const database = this.getAsset("assetId", Dependencies.DATABASE);
const url = database('url');
const username = database('username');
```

## Available Dependencies

The system currently supports two types of dependencies:

1. **DATABASE**
   - url
   - username
   - password

2. **SENTRY**
   - dsn

## Adding New Dependency Types

1. Add the new dependency type to `Dependencies` enum in `BaseStack/types.ts`
2. Update the `DependecyAttributes` interface with the new dependency structure
3. Update the dependency configuration in your deployment

## Type System and IDE Integration

One of the key features of this project is its strongly-typed dependency management system. The type system is designed to provide complete IDE support and compile-time safety when accessing dependencies.

### How It Works

The type system is built around two main types:

1. The `Dependencies` enum that defines available dependency types:
```typescript
enum Dependencies {
    DATABASE = "DATABASE",
    SENTRY = "SENTRY"
}
```

2. The `DependecyAttributes` interface that maps each dependency type to its structure:
```typescript
interface DependecyAttributes {
    [Dependencies.DATABASE]: {
        url: string;
        username: string;
        password: string;
    };
    [Dependencies.SENTRY]: {
        dsn: string;
    };
}
```

### Type Safety Benefits

When accessing dependencies using `getAsset`, the type system ensures:

1. You can only request valid dependency types:
```typescript
// ✅ This works
const database = this.getAsset("assetId", Dependencies.DATABASE);

// ❌ This won't compile - "INVALID" is not a valid dependency type
const invalid = this.getAsset("assetId", "INVALID");
```

2. You can only access valid attributes for each dependency type:
```typescript
const database = this.getAsset("assetId", Dependencies.DATABASE);

// ✅ These work - they are valid DATABASE attributes
const url = database('url');
const username = database('username');

// ❌ This won't compile - 'invalid' is not a DATABASE attribute
const invalid = database('invalid');

// ❌ This won't compile - 'dsn' is a SENTRY attribute, not DATABASE
const invalid = database('dsn');
```

### IDE Support

This type system provides excellent IDE support:
- Auto-completion for dependency types
- Auto-completion for dependency attributes
- Inline documentation
- Immediate error feedback
- Refactoring support

For example, when you type:
```typescript
const database = this.getAsset("assetId", Dependencies.DATABASE);
const value = database('
```
Your IDE will automatically suggest only valid options: `url`, `username`, or `password`.

### Adding New Dependencies

When adding new dependencies, the type system ensures you properly define all required attributes:

1. Add to the enum:
```typescript
enum Dependencies {
    DATABASE = "DATABASE",
    SENTRY = "SENTRY",
    NEW_SERVICE = "NEW_SERVICE"  // Add new dependency type
}
```

2. Add to the interface:
```typescript
interface DependecyAttributes {
    [Dependencies.DATABASE]: {
        url: string;
        username: string;
        password: string;
    };
    [Dependencies.SENTRY]: {
        dsn: string;
    };
    [Dependencies.NEW_SERVICE]: {  // Define structure for new dependency
        apiKey: string;
        endpoint: string;
    };
}
```

The TypeScript compiler will ensure you've properly defined all necessary types and attributes, making it impossible to accidentally miss required fields or make typos in attribute names.
