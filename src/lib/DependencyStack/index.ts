import { Construct } from "constructs";
import { BaseStack } from "../BaseStack";
import { DependencyStackProps } from "./types";
import { DependecyAttributes } from "../BaseStack/types";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/secretsmanager-secret-version";
import { TerraformOutput, Fn } from "cdktf";
/*
    This stack is used to store dependencies , the dependencies are provided as part of the properties
    of the stack, the dependencies are created as secrets in the AWS Secrets Manager, which can then be used by other stacks.
*/
export class DependencyStack extends BaseStack {
    constructor(scope: Construct, id: string, props: DependencyStackProps) {
        super(scope, id, props);
        this.createAssets(props.dependencies);
    }

    private createAssets(dependencies: {
        [key: string]: DependecyAttributes;
    }){
        const dependencySecretName = this.getDependencySecretName();
        const secretManager = new SecretsmanagerSecret(this, dependencySecretName, {
            name: dependencySecretName,
        });
        new SecretsmanagerSecretVersion(this, `${dependencySecretName}-version`, {
            secretId: secretManager.id,
            secretString: JSON.stringify(dependencies),
        });
        new TerraformOutput(this, "DependencySecretNameOutput", {
            value: Fn.jsonencode({
                secret: secretManager.id,
                environment: this.environment,
            }),
        });
    }
};
