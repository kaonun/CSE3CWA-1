# Step 3: Docker setup

## Structure

The Dockerfile uses three stages: install locked dependencies with `npm ci`, lint
and build the Next.js application, then copy its standalone production output
into the runtime image. The runtime contains the required server dependencies,
browser assets, and any public assets, and runs as the existing non-root `node`
user. `node server.js` runs as the main application process.

`next.config.mjs` enables standalone output. `npm run start` migrates the local
database, prepares separate browser/public assets, and starts the generated
server. Docker copies those assets during the build and runs database migrations
before importing the generated server in the same Node process.

The build context excludes host dependencies, build output, Git metadata,
environment files, private keys, local tool settings, and documentation via
`.dockerignore`, including the local `data/` directory. Since Step 4, the health
check calls `/health/database` using Node's built-in HTTP client, so curl is not
required. `/health` remains the application-only liveness endpoint.

The default base image is `node:24-bookworm-slim`, pinned to the verified image
digest `sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20`.
It uses Node 24 and Debian's standard C library. All stages use that same image;
the digest fixes the base contents and the lockfile fixes npm package versions.
Update the digest deliberately when applying runtime/security updates, then
rerun the checks. An alternative verified base can be selected with
`--build-arg NODE_IMAGE=node@sha256:<verified-image-digest>`.

This follows the standard `FROM`, `WORKDIR`, `COPY`, `RUN`, `ENV`, `EXPOSE`, and
`CMD` structure, with separate build/runtime stages. The course lab example has
not been provided, so similarity to its particular Dockerfile remains unchecked.
Design references: [Docker's Next.js guide](https://docs.docker.com/guides/nextjs/)
and [Next.js output configuration](https://nextjs.org/docs/app/api-reference/config/next-config-js/output).

## Run with Docker Desktop

Install/start Docker Desktop with Linux containers, then run from the project
directory:

```sh
docker compose up --build -d --wait
docker compose ps
```

Open `http://localhost:3000`, `/health`, and `/health/database`.
Compose publishes the port only on the local computer. Stop any other application
using port 3000 before starting it, or change the host port in `compose.yaml`.

Inspect or stop this project's service:

```sh
docker compose logs app
docker compose down
```

Alternatively, build/run the image directly:

```sh
docker build --tag phonemele:assessment-2 .
docker run --rm --init --publish 127.0.0.1:3000:3000 phonemele:assessment-2
```

## Verification

```sh
npm run test:docker
```

This command validates the Compose configuration, builds the Dockerfile, starts
a uniquely named temporary container on an automatically allocated loopback
port, waits for its health check, verifies its non-root user, and runs backend
checks. Step 4 extends this with a uniquely named test volume, ORM fixture checks,
and removing/recreating the container on the same volume to verify persistence.
Both activity types and browser assets are still checked. The command removes
only its owned temporary container/labelled volume; the image remains available.

You can also test an already running container, without starting a local server:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3000'
npm run test:backend
Remove-Item Env:TEST_BASE_URL
```

The test target is restricted to a loopback HTTP URL. On Windows, open a new
terminal after installing Docker so both the command and its credential helper
are on PATH. In an existing PowerShell terminal, prepend the installed tools:

```powershell
$env:PATH = 'C:\Program Files\Docker\Docker\resources\bin;' + $env:PATH
```

`DOCKER_BIN` can optionally override the Docker executable used by the check;
its credential helper must still be on PATH.

## TLS-scanning networks (optional)

Normal networks need no extra configuration. On this Windows machine, Norton
Web/Mail Shield signs npm's HTTPS connection using a root already trusted by
Windows. The Linux base image does not inherit that root, so a clean dependency
installation initially failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

Use only an independently verified, already trusted public CA certificate, never
a private key or an untrusted certificate downloaded to bypass an error. Supply
its PEM contents through `DOCKER_BUILD_CA_PEM`. For example, if you already have
the trusted public certificate exported as PEM:

```powershell
$env:DOCKER_BUILD_CA_PEM = Get-Content -LiteralPath 'C:\path\to\trusted-root.pem' -Raw
npm run test:docker
docker compose -f compose.yaml -f compose.trusted-ca.yaml up --build -d --wait
Remove-Item Env:DOCKER_BUILD_CA_PEM
```

For this machine, the verified Norton root can instead be read directly from
Windows' existing trust store with Node 24; no certificate file is needed:

```powershell
$env:DOCKER_BUILD_CA_PEM = (node --use-system-ca -e "const tls=require('node:tls');const {X509Certificate}=require('node:crypto');const fingerprint='AE:A6:A4:79:7B:88:62:47:50:44:CA:AC:41:E2:44:84:4E:24:6F:C1:5A:D7:11:3F:F3:C2:2F:54:84:20:BA:D6';const pem=tls.getCACertificates('system').find(p=>new X509Certificate(p).fingerprint256===fingerprint);if(!pem)throw new Error('Verified Windows root CA not found');console.log(pem);") -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Trusted certificate lookup failed' }
```

Then use the verification/Compose commands above. The fingerprint is specific
to the inspected local certificate; do not reuse it as a universal Norton root.
If Norton rotates it, verify the new root independently before updating it.

The optional [Docker build secret](https://docs.docker.com/build/building/secrets/)
mount exists only during `npm ci`. Node's `NODE_EXTRA_CA_CERTS` adds that trust for
the installation command without disabling TLS verification. Neither the CA
mount nor its environment setting is copied into the production runtime.
`compose.trusted-ca.yaml` is an explicit opt-in build override, not a runtime
secret. The default Compose file stays usable without machine-specific trust.

## Step 3 verification record

Verified on 7 October 2026 after installing Docker Desktop 4.94.0 and starting
its Linux engine. The pinned Linux image uses Node.js 24.21.0; local Windows
verification uses Node.js 24.19.0.

- Local lint and standalone production build passed.
- All 27 HTTP checks passed against the local standalone server.
- A clean Linux dependency installation, lint, and production build succeeded
  using the optional already-trusted CA mount described above.
- `npm run test:docker` passed: the container became healthy, ran as non-root,
  served the browser assets, and passed all 27 HTTP checks.
- The build-only CA mount and `NODE_EXTRA_CA_CERTS` setting were absent from the
  application container.
- Compose startup with the optional CA override and `--wait` reached healthy on
  `127.0.0.1:3000`, then passed the same 27 HTTP checks.
- The uniquely named verification container and the separate Compose test
  container/network were removed. The built image remains available; Docker
  Desktop remains installed and running.

The container implementation and runtime checks are complete. Exact comparison
to the course lab's Dockerfile remains unverified until that material is supplied.
These HTTP checks do not claim a new interactive-browser or offline-export
regression pass; saved-data/export verification is scheduled for Step 6.

## Step 4 update

SQLite/Drizzle storage, migration-on-startup, database readiness, and a persistent
`teacher-data` volume are now implemented. See [database design and verification](database.md)
for the schema, 22 storage/persistence checks, 29 local HTTP checks, and verified
Linux container recreation. Local and Docker data are separate. Use
`docker compose down` without `--volumes`/`-v` to retain teacher records.

## Step 5 update

The Library and saved-content CRUD APIs are now implemented. The updated image
passed all 47 normal HTTP checks before and after container replacement, plus
22 direct database checks. Additional API-created/edited words and both saved
configuration types retained their content on the same temporary test volume.
See [the CRUD workflow and verification](crud.md). Verification removes only
its own temporary container and labelled volume, never `teacher-data`.

## Step 6 update

The image now supports generation from saved configuration IDs for both activity
types. All 61 normal HTTP checks passed before and after container replacement,
including saved-data generation and offline-runtime gameplay; the 22 direct
database checks also passed. Both saved outputs generated correctly from
API-created data retained across replacement. See [saved-generation verification](saved-generation.md).

## Step 7 update

The updated image includes the shared phoneme validator used by storage readers
and generation. It passed all 72 normal HTTP check groups before and after
container replacement, plus 23 direct database checks. Persisted API-created
records still generate both activity types. The build-only CA remains absent
from the non-root runtime. See [validation and error handling](validation.md)
for the separate local damaged-data tests and client/browser recovery checks.
