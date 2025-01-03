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
```bash
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

```json
{
    "[assetId]": {
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
```typescript
const database = this.getAsset("assetId", Dependencies.DATABASE);
const url = database('url');
const username = database('username');
```

## Available Dependencies

The system currently supports three types of dependencies:

1. **DATABASE**
   - `url`: string
   - `username`: string
   - `password`: string

2. **SENTRY**
   - `dsn`: string

3. **EXAMPLE**
   - `str`: string
   - `num`: number
   - `bool`: boolean

## Type System Deep Dive

The type system is built to provide complete type safety and IDE support through TypeScript's powerful generic system. Here's how it works:

### Generic Type Flow

The `getDependency` method leverages the generic type system to ensure type safety:

```typescript
public getDependency<Dep extends keyof DependecyAttributes>(
    assetId: string, 
    dependencyType: Dep
) {
    // Returns a typed accessor function
    return <Attr extends keyof DependecyAttributes[Dep]>(
        attribute: Attr
    ): DependecyAttributes[Dep][Attr] => {
        // Implementation
    };
}
```

Let's break down how the types flow through this system:

1. When you call `getDependency` with a specific dependency type:
   ```typescript
   const database = getDependency("assetId", Dependencies.DATABASE);
   ```
   The `Dep` generic is constrained to `keyof DependecyAttributes`, ensuring only valid dependency types are accepted.

2. The returned accessor function is itself generic, where `Attr` is constrained to `keyof DependecyAttributes[Dep]`:
   ```typescript
   const url = database('url'); // TypeScript knows this returns string
   const username = database('username'); // TypeScript knows this returns string
   ```
   Because `Dep` was set to `DATABASE`, TypeScript knows exactly which attributes are valid and their types.

3. The return type `DependecyAttributes[Dep][Attr]` automatically resolves to the correct type:
   - For `DATABASE` attributes: always `string`
   - For `EXAMPLE` attributes: `string`, `number`, or `boolean` depending on the attribute
   - For `SENTRY` attributes: `string`

This creates a fully type-safe chain where:
- You can only request valid dependency types
- You can only access valid attributes for each dependency
- Each attribute automatically resolves to its correct type
- TypeScript can provide accurate autocompletion at every step

### Example Type Resolution

```typescript
// Type flow for DATABASE
const database = getDependency("assetId", Dependencies.DATABASE);
// database: <Attr extends "url" | "username" | "password">(attribute: Attr) => string

// Type flow for EXAMPLE
const example = getDependency("assetId", Dependencies.EXAMPLE);
const str = example('str');    // TypeScript knows: string
const num = example('num');    // TypeScript knows: number
const bool = example('bool');  // TypeScript knows: boolean
```

## CDKTF Compilation Model and Terraform Functions

A key aspect of this project's architecture is how it handles attribute access through CDKTF's Terraform functions. This is necessary because of how CDKTF works:

1. **Compilation Time vs Runtime**: When your TypeScript code runs, it's not actually executing infrastructure changes - it's generating a Terraform configuration. This means we don't have access to the actual secret values during the TypeScript execution.

2. **Terraform Function Usage**: Instead of directly accessing values, we use CDKTF's `Fn.lookupNested` and `Fn.jsondecode` functions. These get compiled into Terraform function calls that will be evaluated when Terraform actually runs. For example:

```typescript
const accessor = (attribute) => Fn.lookupNested(
    Fn.jsondecode(secretString), 
    [assetId, dependencyType, attribute]
);
```

Gets compiled into Terraform code like:

```hcl
  jsondecode(data.aws_secretsmanager_secret_version.dependencies.secret_string).someAssetId.DATABASE.url
```

3. **Why This Matters**: This approach ensures that:
   - Secret values are only accessed at Terraform runtime, not during compilation
   - The TypeScript code generates valid Terraform configurations
   - We maintain type safety while working with values that don't exist during compilation

4. **Type Safety**: Despite working with values that don't exist during compilation, our type system still ensures that:
   - We can only request valid dependency types
   - We can only access valid attributes for each dependency
   - The TypeScript compiler knows the correct return type for each attribute

This is why you'll see Terraform functions used throughout the codebase instead of direct object access - it's a fundamental aspect of how CDKTF translates TypeScript code into Terraform configurations.

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
    SENTRY = "SENTRY",
    EXAMPLE = "EXAMPLE"
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
    [Dependencies.EXAMPLE]: {
        str: string;
        num: number;
        bool: boolean;
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
const value = database(<'url'|'username'|'password'>)
```
Your IDE will automatically suggest only valid options: `url`, `username`, or `password`.

### Adding New Dependencies

When adding new dependencies, the type system ensures you properly define all required attributes:

1. Add to the enum:
```typescript
enum Dependencies {
    DATABASE = "DATABASE",
    SENTRY = "SENTRY",
    EXAMPLE = "EXAMPLE",
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
    [Dependencies.EXAMPLE]: {
        str: string;
        num: number;
        bool: boolean;
    };
    [Dependencies.NEW_SERVICE]: {  // Define structure for new dependency
        apiKey: string;
        endpoint: string;
    };
}
```
The TypeScript compiler will ensure you've properly defined all necessary types and attributes, making it impossible to accidentally miss required fields or make typos in attribute names.

