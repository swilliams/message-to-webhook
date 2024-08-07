import { InteractionResponseFlags, InteractionResponseType, InteractionType, verifyKey } from 'discord-interactions';

import { AutoRouter } from 'itty-router';
import { WEBHOOK_COMMAND } from './commands';

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

async function sendPostToWebhook(webhookURL, postBody) {
	return await fetch(webhookURL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(postBody),
	});
}

const router = AutoRouter();

/**
 * A simple :wave: hello page to verify the worker is working.
 */
router.get('/', (request, env) => {
	return new Response(`👋 ${env.DISCORD_APPLICATION_ID}`);
});

/**
 * Main route for all requests sent from Discord.  All incoming messages will
 * include a JSON payload described here:
 * https://discord.com/developers/docs/interactions/receiving-and-responding#interaction-object
 */
router.post('/', async (request, env) => {
	const body = await server.verifyDiscordRequest(request, env);
	const { isValid, interaction } = body;
	if (!isValid || !interaction) {
		return new Response('Bad request signature.', { status: 401 });
	}

	if (interaction.type === InteractionType.PING) {
		// The `PING` message is used during the initial webhook handshake, and is
		// required to configure the webhook in the developer portal.
		return new JsonResponse({
			type: InteractionResponseType.PONG,
		});
	}

	if (interaction.type === InteractionType.APPLICATION_COMMAND) {
		switch (interaction.data.name.toLowerCase()) {
			case WEBHOOK_COMMAND.name.toLowerCase(): {
				let message = {};
				try {
					message = getFirstMessageOrError(interaction.data);
				} catch (e) {
					console.error(e);
					return new JsonResponse({ error: 'Could not find message' }, { status: 400 });
				}
				const webhookURL = env.WEBHOOK_URL;
				const postBody = {
					messageContent: message.content,
					messageURL: `https://discord.com/channels/${interaction.guild_id}/${message.channel_id}/${message.id}`,
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
