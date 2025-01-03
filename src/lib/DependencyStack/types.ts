import { BaseStackProps, DependecyAttributes, Dependencies } from "../BaseStack/types";

export interface DependencyStackProps extends BaseStackProps {
    dependencies: {
        [key: string]: DependecyAttributes;
    };
}