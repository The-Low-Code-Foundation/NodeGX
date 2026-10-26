# create-nodegx-vibe

Sets a folder up so [Mistral Vibe](https://mistral.ai/products/vibe) can build [NodeGX](https://nodegx.io) apps in it,
with Mistral Large 4.

```
npm create nodegx-vibe my-apps
cd my-apps
vibe
```

(On Vibe 2.x, start it with `vibe --legacy-harness`, which shows the model NodeGX's error messages. Vibe 3 has no such
flag and shows them anyway.) Trust the folder when Vibe asks, then say what you want to build, in a paragraph. Large 4 builds the app in a folder
inside `my-apps`, checks it in a browser against what you asked for, and tells you line by line what works. To see it
running:

```
npx @nodegx/preview my-apps/<your app> --open
```

To try it on your phone, on the same Wi-Fi: add `--host 0.0.0.0`, and open the address it prints on the phone. The
address carries a token, so nobody else on the network can open it without being handed the whole link.

The command writes `.vibe/config.toml` (Large 4, the NodeGX server, the NodeGX agent as the default), the NodeGX agent
and its skills under `.vibe/`, and an `AGENTS.md` written for Large 4. It is
[`create-nodegx`](https://www.npmjs.com/package/create-nodegx) with its Vibe profile: the same server, the same app
format, and you can open the app in the NodeGX visual editor whenever you like. It never touches your global Vibe
settings and never replaces a file you already have.
