import { InteractionResponseFlags, InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

import { AutoRouter } from 'itty-router';

class JsonResponse extends Response {
	constructor(body, init) {
		const jsonBody = JSON.stringify(body);
		init = init || {
			headers: {
				'content-type': 'application/json;charset=UTF-8',
			},
		};
		super(jsonBody, init);
	}
}

function getFirstMessageOrError(data) {
	if (data && data.resolved && data.resolved.messages) {
		const keys = Object.keys(data.resolved.messages);
		if (keys.length === 0) {
			throw new Error('messages object was empty');
		}
		return data.resolved.messages[keys[0]];
	}
	throw new Error('No message found in data');
}

function buildResponseBody(messageContent) {
	return {
		type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
		data: {
			content: messageContent,
			flags: InteractionResponseFlags.EPHEMERAL,
		},
	};
}

const router = AutoRouter();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
	return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

const WEBHOOK_COMMAND = {
	name: 'message-to-webhook',
	description: 'Send a message to a webhook',
};

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
	const { isValid, interaction } = await server.verifyDiscordRequest(request, env);
	if (!isValid || !interaction) {
		return new Response('Bad request signature.', { status: 401 });
	}

    console.log('is valid');

	if (interaction.type === InteractionType.PING) {
        console.log('got ping');
		// The `PING` message is used during the initial webhook handshake, and is
		// required to configure the webhook in the developer portal.
		return new JsonResponse({
			type: InteractionResponseType.PONG,
		});
	}

	if (interaction.type === InteractionType.APPLICATION_COMMAND) {
        console.log('app command', interaction.data.name);
		switch (interaction.data.name.toLowerCase()) {
			case WEBHOOK_COMMAND.name.toLowerCase():
				{
                const messageData = request.body.data;
				let message = {};
				try {
					message = getFirstMessageOrError(messageData);
				} catch (e) {
					console.error(e);
					return new JsonResponse({ error: 'Could not find message' }, { status: 400 });
				}

				const webhookURL = process.env.WEBHOOK_URL;
				const postBody = {
					messageContent: message.content,
					messageURL: `https://discord.com/channels/${request.body.guild_id}/${message.channel_id}/${message.id}`,
					author: message.author.username,
					authorGlobalName: message.author.global_name,
				};

				const webhookResponse = await sendPostToWebhook(webhookURL, postBody);

				let messageContent = webhookResponse.ok ? '✅ Message sent to webhook.' : 'Error: ' + (await webhookResponse.text());

				return new JsonResponse(buildResponseBody(messageContent));
            }
		}
	}
});

router.all('*', () => new Response('Not Found.', { status: 404 }));

async function verifyDiscordRequest(request, env) {
	const signature = request.headers.get('x-signature-ed25519');
	const timestamp = request.headers.get('x-signature-timestamp');
	const body = await request.text();
	const isValidRequest = signature && timestamp && (await verifyKey(body, signature, timestamp, env.DISCORD_PUBLIC_KEY));
	if (!isValidRequest) {
		return { isValid: false };
	}

	return { interaction: JSON.parse(body), isValid: true };
}

const server = {
	verifyDiscordRequest,
	fetch: router.fetch,
};

export default server;
