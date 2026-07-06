import { ValidationContext, ASTVisitor, GraphQLError } from "graphql";

/**
 * Creates a GraphQL validation rule to limit total query complexity (field count).
 */
export const complexityLimitRule = (maxComplexity: number) => {
    return (context: ValidationContext): ASTVisitor => {
        let complexity = 0;

        return {
            Field() {
                complexity++;
                if (complexity > maxComplexity) {
                    context.reportError(
                        new GraphQLError(
                            `Query complexity of ${complexity} exceeds the maximum allowed complexity of ${maxComplexity}`,
                            {}
                        )
                    );
                }
            },
        };
    };
};
