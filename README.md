# Accounts Officer

<!-- toc-head -->

## Table of contents

- [About](#about)
- [Usage](#usage)
- [Development](#development)
  - [Frameworks](#frameworks)
  - [Setup](#setup)
  - [Regular use](#regular-use)
  - [Irregular use](#irregular-use)
  - [Formatting](#formatting)
- [Releasing](#releasing)
- [Ideas / Future work](#ideas--future-work)

<!-- toc-tail -->

## About

Accounts Officer is a Node.js bot that queries platform APIs for account data
and resources and pushes it into a Airtable base.
It's a Cloud Native CLI container designed to be deployed as a Kubernetes CronJob.
There are commands to run everything, each services or to show individual bits of data.

Accounts Officer currently supports pulling data from:

- DigitalOcean → Droplets, Volumes, Clusters, Volumes, Snapshots & Load Balancers
- AWS → Buckets & Domains and single-region RDS & Lightsails
- GoDaddy → domains
- SendGrid → API keys

Accounts Officer pulls in data from those services and merges records
with those already in Airtable.
It will try to update existing records or create new ones
and if a record no longer exists it marks it as `unlinked`.

## Usage

### Configuration

**environment variables**

see [.env.example](/.env.example)

**config.json**

Mount into the container at `/app/config.json`,
see [config.example.json](/config.example.json)

**command**

set your containers arguments to be the command you want it run,
it's set to `all` by default

### Airtable structure

You need to have an Airtable base setup with the correct structure.
The bot will only touch known fields so you can have extra custom columns if you like.
But it will fail if the structure doesn't match what it is expecting.

Setup `config.json` to map your Airtable base for the bot.
Set the `base` value to link to a specific base
and use `tables` to map each service to your table name.

Heres what each table should look like:

> You can add whatever other custom fields you like!

**DigitalOcean**

| Field  | Type                                                                       |
| ------ | -------------------------------------------------------------------------- |
| Name   | Single line text                                                           |
| Type   | Single Select - droplet, cluster, database, volume, snapshot, loadbalancer |
| Status | Single Select - active, unlinked                                           |
| Cost   | Currency                                                                   |

**AWS**

| Field  | Type                                                |
| ------ | --------------------------------------------------- |
| Name   | Single line text                                    |
| Type   | Single Select - bucket, lightsail, domain, database |
| Status | Single Select - active, unlinked                    |
| Cost   | Currency                                            |

**GoDaddy**

| Field        | Type                             |
| ------------ | -------------------------------- |
| Name         | Single line text                 |
| Type         | Single Select - domain           |
| Status       | Single Select - active, unlinked |
| Expires      | Date                             |
| HttpResponse | Single line text                 |

**SendGrid**

| Field  | Type                             |
| ------ | -------------------------------- |
| Name   | Single line text                 |
| Type   | Single Select - apikey           |
| Status | Single Select - active, unlinked |

## Development

To develop on this repo you will need to have Docker and Node.js installed on your dev machine
and have an understanding of them.
This guide assumes you have the repo checked out and are on macOS,
but equivalent commands are available.

### Frameworks

- [yargs](https://yargs.js.org) for CLI parsing and commands syntax
- [got](https://github.com/sindresorhus/got#readme) for http requests
- [superstruct](https://docs.superstructjs.org) for validating javascript objects and structures
- [puggle](https://github.com/robb-j/puggle#readme) was used to bootstrap this project

### Setup

You'll only need to follow this setup once for your dev machine.

```bash
# Setup your dev environment
# -> Fill in the values in your favourite text editor
cp .env.example .env

# Setup your app config
# -> Fill in the values in your favourite text editor
cp config.example.json config.json

# Install node.js dependencies
npm install
```

### Regular use

These are the commands you'll regularly run to develop the API, in no particular order.

```bash
# Get CLI usage and help
npm run start -- --help

# Run the CLI directly with a command
# -> Loads in the .env
# -> Runs TypeScript directly through ts-node
# -> -- seperator is needed for options
npm run start aws

# Start a node.js debugger running the CLI
# -> It will break on the first line of code to allow a debugger to be attached (--inspect-brk)
npm run debug godaddy
```

### Irregular use

These are commands you might need to run but probably won't, also in no particular order.

```bash
# Manually run the TypeScript build
npm run build

# Run TypeScript as a linter
npm run lint

# Manually format all code using Prettier
npm run prettier

# Generate the table-of-contents in this readme
npm run readme-toc
```

### Formatting

The code in this repo is automatically formatted using [Prettier].
This may run in your IDE automatically on-save already.
It is also setup to run the formatter on all git-staged code.
This uses the [yorkie](https://www.npmjs.com/package/yorkie)
and [lint-staged](https://www.npmjs.com/package/lint-staged)
packages which are configured in the package.json.

You can manually run the formatter with `npm run prettier` if you want.

## Releasing

Releases are automated using git tags,
which should be generated using the `npm version` command.
This generates a `vX.Y.Z` git tag which, when pushed, runs a GitHub workflow
to build a container that is pushed to
[DockerHub](http://hub.docker.com/r/openlab/accounts-officer)

## Ideas / Future work

- Add tests to ensure stability
- Refactor fixed logic into a functional data-based runner, see [services/airtable.ts#fetchAndMerge](/src/services/airtable.ts)
- Add more services/resources
- Pull in people too
- Allow aws regions to be customised
- Explore a "billing" sheet which pulls the monthly bill from each service
- Opt-in to services rather than requiring all

---

> This project was set up by [puggle](https://npm.im/puggle)
