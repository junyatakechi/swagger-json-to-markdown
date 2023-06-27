import fs from 'fs';
import path from 'path';

interface Parameter {
    name: string;
    description: string;
    type: string;
    required: boolean;
    in: string;
}

interface SwaggerPath {
    [method: string]: {
        tags?: string[];
        summary?: string;
        description?: string;
        parameters?: Parameter[];
        responses: {
            [statusCode: string]: {
                description: string;
            };
        };
    };
}

interface Property {
    type?: string;
    description?: string;
    items?: {
        $ref: string;
    };
    $ref?: string;
    enum?: string[];
    default?: string;
}

interface SwaggerJson {
    info: {
        title: string;
        version: string;
    };
    paths: {
        [path: string]: SwaggerPath;
    };
    definitions: {
        [definition: string]: {
            type: string;
            properties?: {
                [property: string]: Property;
            };
        };
    };
}

interface Definition {
    type: string;
    properties?: {
        [property: string]: Property;
    };
    enum?: string[];
    default?: string;
}

const generateAnchorLink = (tag: string, method: string, path: string): string => {
    return `${tag}-${method.toLowerCase()}-${path.replace(/\//g, '')}`;
};

const createTableFromParams = (parameters: Parameter[]): string => {
    let table = '| Name | Description | Type | Required | In |\n';
    table += '|------|-------------|------|----------|----|\n';
    for (const param of parameters) {
        table += `| ${param.name} | ${param.description} | ${param.type} | ${param.required} | ${param.in} |\n`;
    }
    return table;
};

const createTableFromResponses = (responses: { [statusCode: string]: { description: string; schema?: { $ref: string }; }; }): string => {
    let table = '| Code | Description | Schema |\n';
    table += '|------|-------------|--------|\n';
    for (const responseCode in responses) {
        const response = responses[responseCode];
        let schemaLink = '';
        if (response.schema && response.schema.$ref) {
            schemaLink = response.schema.$ref.split("/").slice(-1)[0];
        }
        table += `| ${responseCode} | ${response.description} | [${schemaLink}](#${schemaLink}) |\n`;
    }
    return table;
};

const createDefinitionTables = (definitions: { [definition: string]: Definition; }): { markdown: string; tocDefinitions: string; } => {
    let markdown = '';
    let tocDefinitions = '';

    for (const definition in definitions) {
        tocDefinitions  += `  - [${definition}](#${definition})\n`;

        markdown += `<a id="${definition}"></a>\n`;
        markdown += `## ${definition}\n`;

        const defDetails = definitions[definition];

        // Check if the definition is an enum
        if (defDetails.enum) {
            markdown += `#### Enum:\n`;
            for (const enumValue of defDetails.enum) {
                markdown += `- ${enumValue}\n`;
            }
            if (defDetails.default) {
                markdown += `- **Default**: ${defDetails.default}\n`;
            }
            markdown += '\n';
        } else if (defDetails.properties) {
            markdown += '| Property | Type | Description |\n';
            markdown += '|----------|------|-------------|\n';

            for (const property in defDetails.properties) {
                const propDetails = defDetails.properties![property];

                let propertyType = propDetails.type;
                if (propDetails.$ref) {
                    const refLink = propDetails.$ref.split("/").slice(-1)[0];
                    propertyType = `[${refLink}](#${refLink})`;
                } else if (propDetails.items && propDetails.items.$ref) {
                    const refLink = propDetails.items.$ref.split("/").slice(-1)[0];
                    propertyType = `[${refLink}](#${refLink})`;
                }

                let description = propDetails.description || '';
                if (propDetails.enum) {
                    description += ` Enum: ${propDetails.enum.join(', ')}.`;
                }
                if (propDetails.default) {
                    description += ` Default: ${propDetails.default}.`;
                }

                markdown += `| ${property} | ${propertyType} | ${description} |\n`;
            }
        }
    }

    return { markdown, tocDefinitions };
};


const parseSwagger = (swaggerJson: SwaggerJson): string => {
    const date = new Date();
    let title = `# ${swaggerJson.info.title}\n\nVersion: ${swaggerJson.info.version}\n\nUpdated: ${date.toLocaleString()}\n\n`;
    let markdown = ""
    let tocPaths = '## Table of Contents for Paths\n\n';
    let tocDefinitions = '## Table of Contents for Definitions\n\n';

    const pathsByTag: Record<string, SwaggerPath> = {};

    for (const path in swaggerJson.paths) {
        for (const method in swaggerJson.paths[path]) {
            const operation = swaggerJson.paths[path][method];
            const tags = operation.tags || ['Other'];

            for (const tag of tags) {
                if (!pathsByTag[tag]) {
                    pathsByTag[tag] = {};
                }

                pathsByTag[tag][`${method.toUpperCase()} ${path}`] = operation;
            }
        }
    }

    for (const tag in pathsByTag) {
        tocPaths += `- [${tag}](#${tag})\n`;

        markdown += `<a id="${tag}"></a>\n`;
        markdown += `# ${tag}\n`;

        for (const methodPath in pathsByTag[tag]) {
            const operation = pathsByTag[tag][methodPath];

            const anchorLink = generateAnchorLink(tag, methodPath.split(' ')[0], methodPath.split(' ')[1]);
            tocPaths += `  - [${methodPath}](#${anchorLink})\n`;

            markdown += `<a id="${anchorLink}"></a>\n`;
            markdown += `## ${methodPath}\n`;
            markdown += `### Summary\n\n${operation.summary || ''}\n`;
            markdown += `### Description\n\n${operation.description || ''}\n`;

            markdown += `### Parameters\n\n`;
            markdown += createTableFromParams(operation.parameters || []);

            markdown += `### Responses\n\n`;
            markdown += createTableFromResponses(operation.responses);

            markdown += '\n---\n';
        }
    }

    const definitionsTables = createDefinitionTables(swaggerJson.definitions);
    markdown += '# Definition\n\n';
    markdown += definitionsTables.markdown;
    tocDefinitions += definitionsTables.tocDefinitions;

    return `${title}\n${tocPaths}\n${tocDefinitions}\n${markdown}`;
};



const main = (): void => {
    const swaggerFilePath = process.argv[2];  // Swagger JSON file path from console arguments
    if (!swaggerFilePath) {
        console.error('Please provide a path to a Swagger JSON file.');
        process.exit(1);
    }

    const outputFilePath = path.join(path.dirname(swaggerFilePath), `${path.basename(swaggerFilePath, '.json')}.md`);  // output Markdown file path

    fs.readFile(swaggerFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error(`Error reading file from disk: ${err}`);
        } else {
            const swaggerJson = JSON.parse(data) as SwaggerJson;
            const markdown = parseSwagger(swaggerJson);
            fs.writeFileSync(outputFilePath, markdown);
            console.log(`Markdown file has been created at: ${outputFilePath}`);
        }
    });
};

main();
