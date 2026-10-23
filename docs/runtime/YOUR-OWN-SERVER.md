# Your app on your own server

<!-- P26 lane 5's runbook (BOARD §2). Written 2026-10-23 to the content-authoring skill; offline checks clean but for
     three false alarms. Needs a NodeGX release carrying deploy_to_vm and @nodegx/preview's --full-stack before a
     stranger can follow it from npm. Not yet followed end to end on a fresh server. -->

You can run a NodeGX app on a Linux server you rent. Anyone with its web address can then use it. The app, its data
and its cloud functions all run on that server. They start again by themselves when the server restarts. You set the
server up once. Each publish after that is one request to your AI assistant or one click in NodeGX Studio.

## What you need

- A Linux server running Ubuntu or Debian, rented from any company that offers virtual servers.
- Its IP address, such as 203.0.113.7, and a login as root. A user who can run sudo without a password works too.
- A web address for the app if you want one, such as app.example.com, and access to that domain's DNS settings.
  Without one, only you can open the app, from your own computer over ssh.

## Set the server up once

Each step is a command to type in a terminal. Replace 203.0.113.7 with your server's IP address.

**1. Let your computer log in without a password.** If you've never made an ssh key on this computer, make one first:

    ssh-keygen -t ed25519

Then copy it to the server. The server asks for its password this one time:

    ssh-copy-id root@203.0.113.7

**2. Log in to the server.** The commands in steps 3 and 4 run there, not on your computer:

    ssh root@203.0.113.7

**3. Install Node 22, rsync and curl.** Ubuntu's own Node is too old for the app's backend, so this takes it from
NodeSource:

    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs rsync curl

**4. Install Caddy, if the app has a web address.** Caddy is the web server that answers at that address over https.
Install it with the commands in Caddy's own guide for Ubuntu and Debian (caddyserver.com/docs/install). Then let it read the sites NodeGX adds:

    mkdir -p /etc/caddy/conf.d
    echo 'import /etc/caddy/conf.d/*' >> /etc/caddy/Caddyfile
    systemctl reload caddy

**5. Point the web address at the server.** In your domain's DNS settings, add an A record for the name (app.example.com)
with the server's IP address. The change can take a while to reach everyone.

## Publish the app

**With your AI assistant**, in a conversation where NodeGX is connected, ask for it in your own words, such as
"Put this app on root@203.0.113.7 at app.example.com". The assistant uses NodeGX's deploy_to_vm tool. It checks the
server before it sends anything, then answers with the app's address.

**In NodeGX Studio**, choose Publish, then A Server of Your Own. Type the server, the web address and a name for the
app. Keep the port Studio offers unless another app on that server already uses it.

The app's records, uploads and accounts live on the server from then on, in a folder of their own.

## Publish again

To update the app, publish it again under the name you gave it the first time. The records people have added stay where they are. If you changed the
app's access rules, the new ones replace the server's. The cloud functions and their secrets are sent again each time.

## If it stops

NodeGX checks the server before changing anything. If something is missing, a message names it. These are the
usual messages:

- **"refused the login"**: the server doesn't accept this computer's ssh key yet. Run step 1.
- **"is missing what the app needs"**: install what it names, in step 3 or step 4.
- **"does not read /etc/caddy/conf.d/"**: add the line from step 4. The message gives the command.
- **"port … is taken by something else"**: another program on the server uses that port. Choose a different one.
- **"Nothing is built in this project yet"**: the app still shows the page NodeGX made when the project was created.
  Build the app first.
