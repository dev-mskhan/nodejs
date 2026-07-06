import { ValidationContext, ASTVisitor, GraphQLError } from "graphql";

/**
 * Creates a GraphQL validation rule to limit query depth.
 */
export const depthLimitRule = (maxDepth: number) => {
    return (context: ValidationContext): ASTVisitor => {
        return {
            OperationDefinition(node) {
                const checkDepth = (selectionSet: any, currentDepth: number): void => {
                    if (!selectionSet || !selectionSet.selections) return;

                    if (currentDepth > maxDepth) {
                        context.reportError(
                            new GraphQLError(
                                `Query depth exceeds the maximum allowed depth of ${maxDepth}`,
                                { nodes: [node] }
                            )
                        );
                        return;
                    }

                    for (const selection of selectionSet.selections) {
                        if (selection.selectionSet) {
                            checkDepth(selection.selectionSet, currentDepth + 1);
                        }
                    }
                };

                checkDepth(node.selectionSet, 1);
            },
        };
    };
};
