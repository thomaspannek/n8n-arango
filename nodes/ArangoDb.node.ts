import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { Database } from 'arangojs';

export class ArangoDb implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ArangoDB',
		name: 'arangoDb',
		icon: 'file:arangodb.svg',
		group: ['input'],
		version: 1,
		description: 'Execute ArangoDB queries',
		defaults: {
			name: 'ArangoDB',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'arangoDbApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Database',
				name: 'database',
				type: 'string',
				default: '_system',
				required: true,
				description: 'Name of the database to connect to',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Execute Query',
						value: 'executeQuery',
						description: 'Execute an AQL query',
					},
					{
						name: 'Execute Command',
						value: 'executeCommand',
						description: 'Execute a raw HTTP command',
					},
				],
				default: 'executeQuery',
				required: true,
			},
			{
				displayName: 'Query',
				name: 'query',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['executeQuery'],
					},
				},
				default: '',
				placeholder: 'FOR doc IN collection RETURN doc',
				required: true,
				description: 'The AQL query to execute',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				displayOptions: {
					show: {
						operation: ['executeCommand'],
					},
				},
				default: '',
				placeholder: '/_api/version',
				required: true,
				description: 'The HTTP API command to execute',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const credentials = await this.getCredentials('arangoDbApi');
		const operation = this.getNodeParameter('operation', 0) as string;
		const database = this.getNodeParameter('database', 0) as string;

		const db = new Database({
			url: `${credentials.host}:${credentials.port}`,
			databaseName: database,
			auth: {
				username: credentials.username as string,
				password: credentials.password as string,
			},
		});

		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'executeQuery') {
					const query = this.getNodeParameter('query', i) as string;
					const cursor = await db.query(query);
					const result = await cursor.all();
					returnData.push({ result });
				} else if (operation === 'executeCommand') {
					const command = this.getNodeParameter('command', i) as string;
					const response = await db.request({ path: command });
					returnData.push(await response.json());
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
} 