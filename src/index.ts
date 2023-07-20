#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

interface Schema {
  $ref?: string;
  type?: string;
  properties?: {
    [property: string]: Property;
  };
  title?: string;
}

interface Parameter {
  name: string;
  description: string;
  type: string;
  required: boolean;
  in: string;
  schema?: Schema;
}

interface SwaggerPath {
  [method: string]: {
    operationId: string;
    tags?: string[];
    summary?: string;
    parameters?: Parameter[];
    responses: {
      [statusCode: string]: {
        description: string;
        schema?: {
          $ref: string;
        };
      };
    };
  };
}

interface Property {
    type?: string;
    title?: string;
    items?: {
      $ref: string;
    };
    $ref?: string;
    enum?: string[];
    default?: string;
}

  
interface Definition {
    title?: string;
    type: string;
    properties?: {
      [property: string]: Property;
    };
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
    [definition: string]: Definition;
  };
}

const generateAnchorLink = (tag: string, method: string = "", path: string = ""): string => {
    let anchorLink = tag;
    if (method) {
      anchorLink += `-${method.toLowerCase()}`;
    }
    if (path) {
      anchorLink += `-${path.replace(/\//g, '')}`;
    }
    return anchorLink;
};

const createTableFromParams = (parameters: Parameter[], definitions: { [definition: string]: Definition }): string => {
  let table = '| Name | Description | Type | Required | In |\n';
  table += '|------|-------------|------|----------|----|\n';
  let subTable = '';

  for (const param of parameters) {
    let type = param.type;
    let description = param.description;
    if (param.name === 'body') {
      description = '別途詳細';
    }
    if (param.schema) {
      if (param.schema.$ref) {
        const ref = param.schema.$ref.split('/').slice(-1)[0];
        const refDefinition = definitions[ref];
        if (refDefinition) {
          const anchorLink = generateAnchorLink(ref);
          type = `[${ref}](#${anchorLink})`;
        }
      } else if (param.schema.properties) {
        type = "object";

        subTable += `### ${param.name}の詳細\n\n`;
        subTable += '| Property | Type | Description |\n';
        subTable += '|----------|------|-------------|\n';

        for (const prop in param.schema.properties) {
          let propertyType = param.schema.properties[prop].type;
          let propertyTitle = param.schema.properties[prop].title || '';

          subTable += `| ${prop} | ${propertyType} | ${propertyTitle} |\n`;
        }

        subTable += '\n';
      }
    }
    table += `| ${param.name} | ${description} | ${type} | ${param.required} | ${param.in} |\n`;
  }

  return `${table}\n${subTable}`;
};

  

const createTableFromResponses = (
  responses: { [statusCode: string]: { description: string; schema?: { $ref: string } } }
): string => {
  let table = '| Code | Description | Schema |\n';
  table += '|------|-------------|--------|\n';
  for (const responseCode in responses) {
    const response = responses[responseCode];
    let schemaLink = '';
    if (response.schema && response.schema.$ref) {
      schemaLink = response.schema.$ref.split('/').slice(-1)[0];
    }
    table += `| ${responseCode} | ${response.description} | [${schemaLink}](#${schemaLink}) |\n`;
  }
  return table;
};

const createDefinitionTables = (definitions: { [definition: string]: Definition }): { markdown: string; tocDefinitions: string } => {
    let markdown = '';
    let tocDefinitions = '';
  
    for (const definition in definitions) {
        const anchorLink = generateAnchorLink(definition);
  
      tocDefinitions += `  - [${definition}](#${anchorLink})\n`;
  
      markdown += `<a id="${anchorLink}"></a>\n`; // add the anchor link
      markdown += `## ${definition}\n\n`;
      const defDetails = definitions[definition];

      if (defDetails.title) {
        markdown += `### Summary\n`
        markdown += `${defDetails.title}\n\n`;
      }
  
      if (defDetails.enum) {
        markdown += `### Enum:\n`;
        for (const enumValue of defDetails.enum) {
          markdown += `- ${enumValue}\n`;
        }
        if (defDetails.default) {
          markdown += `- **Default**: ${defDetails.default}\n`;
        }
        markdown += '\n';
      } else if (defDetails.properties) {
        markdown += '| Property | Type | Title |\n';
        markdown += '|----------|------|-------|\n';
  
        for (const property in defDetails.properties) {
          const propDetails = defDetails.properties[property];
  
          let propertyType = propDetails.type;
          if (propDetails.$ref) {
            const refLink = generateAnchorLink(propDetails.$ref.split('/').slice(-1)[0]); // generate the anchor link
            propertyType = `[${refLink}](#${refLink})`;
          } else if (propDetails.items && propDetails.items.$ref) {
            const refLink = generateAnchorLink(propDetails.items.$ref.split('/').slice(-1)[0]); // generate the anchor link
            propertyType = `[${refLink}](#${refLink})`;
          }
  
          let title = propDetails.title || '';
          if (propDetails.enum) {
            title += ` Enum: ${propDetails.enum.join(', ')}.`;
          }
          if (propDetails.default) {
            title += ` Default: ${propDetails.default}.`;
          }
  
          markdown += `| ${property} | ${propertyType} | ${title} |\n`;
        }
      }
  
      markdown += '---\n\n';
    }
  
    return { markdown, tocDefinitions };
};
  

const parseSwagger = (swaggerJson: SwaggerJson): string => {
  const date = new Date();
  let title = `# ${swaggerJson.info.title}\n\nVersion: ${swaggerJson.info.version}\n\nUpdated: ${date.toLocaleString()}\n\n`;
  let markdown = '';
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
    tocPaths += `- [${tag}](#${tag})\n\n`;

    markdown += `<a id="${tag}"></a>\n`;
    markdown += `# ${tag}\n\n`;

    for (const methodPath in pathsByTag[tag]) {
    　const operation = pathsByTag[tag][methodPath];

      const anchorLink = generateAnchorLink(tag, methodPath.split(' ')[0], methodPath.split(' ')[1]);
      tocPaths += `  - [${methodPath}](#${anchorLink})\n`;

      markdown += `<a id="${anchorLink}"></a>\n`;
      markdown += `## ${methodPath}\n\n`;
      markdown += `OperationId: **${operation.operationId || ''}**\n\n`;
      markdown += `### Summary\n\n${operation.summary || ''}\n\n`;
      markdown += `### Parameters\n\n`;
      markdown += createTableFromParams(operation.parameters || [], swaggerJson.definitions);


      markdown += `### Responses\n\n`;
      markdown += createTableFromResponses(operation.responses);

      markdown += '\n---\n';
    }
  }

  const definitionsTables = createDefinitionTables(swaggerJson.definitions);
  markdown += '# Definitions\n\n';
  markdown += definitionsTables.markdown;
  tocDefinitions += definitionsTables.tocDefinitions;

  return `${title}\n${tocPaths}\n${tocDefinitions}\n${markdown}`;
};

const main = (): void => {
  const swaggerFilePath = process.argv[2]; // Swagger JSON file path from console arguments
  if (!swaggerFilePath) {
    console.error('Please provide a path to a Swagger JSON file.');
    process.exit(1);
  }

  const outputFilePath = path.join(path.dirname(swaggerFilePath), `${path.basename(swaggerFilePath, '.json')}.md`); // output Markdown file path

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
