import { Construct } from "constructs";
import { TerraformStack, Fn, S3Backend, DataTerraformRemoteStateS3 } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsSecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/data-aws-secretsmanager-secret-version";
import type { DependecyAttributes, BaseStackProps } from "./types";
import type { DependencyStackProps } from "../DependencyStack/types";

/**
 * BaseStack is an abstract class that provides core functionality for AWS infrastructure stacks.
 * It handles AWS provider setup, S3 backend configuration, and dependency management through AWS Secrets Manager.
 */
export abstract class BaseStack extends TerraformStack {
  /** AWS account ID where the stack will be deployed */
  public readonly accountId: string;
  /** Name identifier for the stack */
  public readonly name: string;
  /** AWS region where resources will be deployed */
  public readonly region: string;
  /** S3 bucket name used for storing Terraform state */
  public readonly backendBucket: string;
  /** AWS Provider instance for this stack */
  public readonly provider: AwsProvider;
  /** Environment name (e.g., 'dev', 'prod') */
  public readonly environment: string;
  /** Loaded dependencies from AWS Secrets Manager, if empty then we are currently setting up the dependency stack so INSTALL_DEPENDENCIES should be true */
  private readonly loadedDependencies: DataAwsSecretsmanagerSecretVersion | undefined;
  /** Name of the dependency stack, if empty then we are currently setting up the dependency stack so INSTALL_DEPENDENCIES should be true */
  public readonly dependencyStackName: string;
  /** Whether this stack is a dependency stack */
  public readonly isDependencyStack: boolean;
  /** Associated dependency stack remote state */
  private readonly dependencyStackRemoteState: DataTerraformRemoteStateS3 | undefined;
  /**
   * Creates a new instance of BaseStack
   * @param {Construct} scope - The scope in which to define this construct
   * @param {string} id - The scoped construct ID
   * @param {BaseStackProps} props - Configuration properties for the stack
   */
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id);
    this.name = id;
    this.accountId = props.accountId;
    this.region = props.region;
    this.environment = props.environment;
    this.backendBucket = props.backendBucket;
    this.dependencyStackName = props.dependencyStackName;
    this.isDependencyStack = this.dependencyStackName === "";
    
    this.provider = new AwsProvider(this, `provider-${this.region}`, {
      region: this.region,
    });

    new S3Backend(this, {
      bucket: this.backendBucket,
      key: `terraform/state/${this.environment}/${this.name}/terraform.tfstate`,
      region: this.region,
      encrypt: true,
      dynamodbTable: "terraform-state-lock",
    });

    if(!this.isDependencyStack){
      this.dependencyStackRemoteState = new DataTerraformRemoteStateS3(this, "DependencyStackRemoteState", {
        bucket: this.backendBucket,
        key: `terraform/state/${this.environment}/${this.dependencyStackName}/terraform.tfstate`,
        region: this.region,
        encrypt: true,
        dynamodbTable: "terraform-state-lock",
      });

      this.loadedDependencies = new DataAwsSecretsmanagerSecretVersion(this, `dependencies-${this.environment}`, {
        secretId: this.getDependencySecretName(),
      });
    }
  }

  /**
   * Gets the AWS Secrets Manager secret name for dependencies
   * @returns {string} The secret name formatted as '{prefix}/{environment}'
   */
  public getDependencySecretName() {
    return `${this.getSetting("dependencySecretNamePrefix")}/${this.environment}`;
  }

  /**
   * Retrieves a specific dependency attribute from AWS Secrets Manager
   * Supports nested attributes using TypeScript's Rest and Infer features
   * @template {keyof DependecyAttributes} Dep
   * @param {string} assetId - The identifier of the asset
   * @param {Dep} dependencyType - The type of dependency to retrieve
   * @returns {<Path extends string[]>(...path: Path) => InferPath<DependecyAttributes[Dep], Path>} A function that accepts a path of attributes and returns its value from the secret
   */
  public getDependency<Dep extends keyof DependecyAttributes>(assetId: string, dependencyType: Dep) {
    if(this.isDependencyStack || !this.loadedDependencies){
      throw new Error("Cannot read dependencies inside dependency stack.");
    }
    const secretString = this.loadedDependencies.secretString;
    /**
     * Lookup the attribute in the secret string
     * Supports nested attributes
     * @template {string[]} Path
     * @param {Path} path - The path of attributes to lookup
     * @returns {InferPath<DependecyAttributes[Dep], Path>} A terraform reference to the attribute
     */
    const accessor = <Path extends string[]>(...path: Path): InferPath<DependecyAttributes[Dep], Path> => Fn.lookupNested(Fn.jsondecode(secretString), [assetId, dependencyType, ...path]);
    return accessor;
  }

  /**
   * Retrieves a setting from the dependency stack
   * settings are stored as outputs in the dependency stack
   * For example one of these outputs is the secret name that stores the dependencies,
   * but other outputs could be the subnetiIds, VPC ID, etc. associated with the environment,
   */
  public getSetting(setting: keyof DependencyStackProps["settings"]) {
    if(this.isDependencyStack || !this.dependencyStackRemoteState){
      throw new Error("Cannot read settings inside dependency stack.");
    }
    return Fn.lookup(Fn.jsondecode(this.dependencyStackRemoteState.getString("SettingsOutput")), setting);
  }
}

/**
 * Infers the type of a nested path in an object
 * @template T - The object type
 * @template P - The path type
 */
type InferPath<T, P extends string[]> = P extends [infer First, ...infer Rest]
  ? First extends keyof T
    ? Rest extends string[]
      ? InferPath<T[First], Rest>
      : never
    : never
  : T;
