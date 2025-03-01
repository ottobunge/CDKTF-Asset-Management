# Asset Management with AWS Secrets Manager

This project demonstrates a secure approach to managing sensitive dependencies using AWS CDK for Terraform (CDKTF) and AWS Secrets Manager, enabling separation of concerns between security/ops and development teams.

## Overview

The system consists of two main components:
1. **DependencyStack**: Used by security/ops teams to safely store sensitive configuration data (like database credentials, API keys, etc.) and environment settings in AWS Secrets Manager.
2. **Application Stack**: Used by development teams to access these secrets and settings without direct exposure to the sensitive values.

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

Required environment variables:
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

### Setting Up Dependencies and Settings
Run with `INSTALL_DEPENDENCIES=true`:

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
    },
    "settings": {
        "subnetIds": ["123123","321321"],
        "vpcId": "vpc-123123",
        "dependencySecretNamePrefix": "asset-management"
    }
}
```

### Accessing Values
```typescript
// Access secrets
const database = this.getDependency("assetId", Dependencies.DATABASE);
const url = database('url');
const username = database('username');

// Access settings
const subnetIds = this.getSetting("subnetIds");
const vpcId = this.getSetting("vpcId");
const secretPrefix = this.getSetting("dependencySecretNamePrefix");
```

## Available Settings

The DependencyStack manages the following settings:

1. **subnetIds**: string[] - List of subnet IDs for the environment
2. **vpcId**: string - VPC ID for the environment
3. **dependencySecretNamePrefix**: string - Prefix used for AWS Secrets Manager secret names (e.g., "asset-management" results in secrets like "asset-management/dev")

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

## Type System and CDKTF Integration

The project uses TypeScript's powerful generic system to provide complete type safety and IDE support. Here's how it works:

### Type System Architecture

The type system is built around two main types:

```typescript
// 1. The Dependencies enum defines available dependency types
enum Dependencies {
    DATABASE = "DATABASE",
    SENTRY = "SENTRY",
    EXAMPLE = "EXAMPLE"
}

// 2. The DependecyAttributes interface maps each type to its structure
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

The `getDependency` method leverages these types to ensure type safety:

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

2. **Terraform Function Usage**: Instead of directly accessing values, we use CDKTF's `Fn.lookupNested`, `Fn.jsondecode`, and `Fn.lookup` functions. These get compiled into Terraform function calls and attribute accesses that will be evaluated when Terraform actually runs. For example:

```typescript
// In TypeScript
const accessor = (attribute) => Fn.lookupNested(
    Fn.jsondecode(secretString), 
    [assetId, dependencyType, attribute]
);

// Access settings
const settingValue = Fn.lookup(
    Fn.jsondecode(this.dependencyStackRemoteState.getString("SettingsOutput")),
    setting
);

// Compiles to HCL
jsondecode(data.aws_secretsmanager_secret_version.dependencies.secret_string).someAssetId.DATABASE.url
jsondecode(data.terraform_remote_state.dependency_stack.outputs.SettingsOutput).subnetIds
```

This approach ensures:
- Secret values are only accessed at Terraform runtime, not during compilation
- TypeScript code generates valid Terraform configurations
- Type safety is maintained even though values don't exist during compilation
- Terraform functions are used instead of direct object access


## Make your own dependencies and settings.
1. Add to `Dependencies` enum in `BaseStack/types.ts`
2. Update `DependecyAttributes` interface with the new dependency structure
3. Update your deployment configuration accordingly

