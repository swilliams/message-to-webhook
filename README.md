# Send a Discord message to a webhook

One of the [only] things I miss from Slack is the ability to "save" a message for later. I'd connect this feature up to my Todoist with a Zapier workflow and have a nice list of messages that I need to not forget about. Discord's built in reminder/inbox functionality just isn't sticky enough for my brain. While this has an extra step I wish didn't have to exist (navigating menus) it's close enough.

I built this very quickly off of:
* [User apps starter project](https://github.com/discord/user-install-example) from [Shay DeWael](https://github.com/shaydewael)
* The [cloudflare sample app](https://github.com/discord/cloudflare-sample-app)

## Project structure
Below is a basic overview of the project structure:

```
├── .dev.vars.example -> sample .env file for registering commands. Remove .example.
├── src/index.js      -> main entrypoint for the app
├── src/commands.js   -> shared command definition
├── src/register.js   -> registering command names w/discord
|-- package-lock.json
├── package.json
├── README.md
```

The main addition is `WEBHOOK_URL` in the env file. I connected a pretty simple Zapier workflow that triggers on a [webhook](https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks#h_01HBGES5DWT8NFWCHFQYSRSK62) and pasted that URL in here.

## Other resources
- Read **[the documentation](https://discord.com/developers/docs/intro)** for in-depth information about API features.
- Browse the `examples/` folder in this project for smaller, feature-specific code examples
- Join the **[Discord Developers server](https://discord.gg/discord-developers)** to ask questions about the API, attend events hosted by the Discord API team, and interact with other devs.
- Check out **[community resources](https://discord.com/developers/docs/topics/community-resources#community-resources)** for language-specific tools maintained by community members.