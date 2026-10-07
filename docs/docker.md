# Docker setup

Requires Docker Desktop (or Docker Engine) with Linux containers and Compose.
From the project directory:

```sh
docker compose up --build -d --wait
docker compose ps
docker compose logs app
docker compose down
```

Open `http://localhost:3000/library`. Stop any local development server first:
both use port 3000. Compose publishes only `127.0.0.1:3000`.
Use `docker compose up --no-build -d --wait` to run an already built image.

The named `teacher-data` volume persists teacher content independently of the
container and local database. Do not pass `--volumes` or `-v` to `down` when
preserving content. See [database backup guidance](database.md).

## Image structure

The Dockerfile installs locked dependencies with `npm ci`, lints/builds the
Next.js app, then copies standalone output, browser assets, ORM runtime and
migrations into a smaller runtime stage. The base Node 24 Debian image is pinned
by digest; update it deliberately and rerun checks for runtime/security updates.

The runtime runs as non-root `node`. Startup migrates the persistent database
before importing the generated server. Its health check calls
`/health/database` using Node's HTTP client. `/health` is application liveness.

The build context excludes host dependencies, build output, Git metadata, local
databases, environment files, keys and docs. Test fixture writers are not shipped
in the production image. The image name is `phonemele:assessment-2`.

```sh
npm run test:docker
```

Verification builds the image, uses an ephemeral loopback port and an owned,
labelled test volume, and checks APIs/persistence across container replacement.
Only those temporary resources are removed; the image and teacher volumes remain.

## Windows command discovery

After installation, open a new terminal so Docker and its credential helper are
on PATH. In an existing PowerShell terminal:

```powershell
$env:PATH = 'C:\Program Files\Docker\Docker\resources\bin;' + $env:PATH
```

`DOCKER_BIN` can override the verifier's executable; its credential helper must
still be discoverable.

## TLS-scanning networks

Ordinary networks need no extra configuration. A Windows-trusted HTTPS-scanning
root is not automatically trusted inside a Linux image. If npm installation
fails with certificate errors, use an independently verified, already trusted
public CA certificate, never a private key or an untrusted certificate obtained
to bypass the failure. Keep TLS verification enabled.

Given that public certificate exported as PEM:

```powershell
$env:DOCKER_BUILD_CA_PEM = Get-Content -LiteralPath 'C:\path\to\trusted-root.pem' -Raw
npm run test:docker
docker compose -f compose.yaml -f compose.trusted-ca.yaml up --build -d --wait
Remove-Item Env:DOCKER_BUILD_CA_PEM
```

On the original development computer, the previously verified Norton root can
also be read from the existing Windows trust store:

```powershell
$env:DOCKER_BUILD_CA_PEM = (node --use-system-ca -e "const tls=require('node:tls');const {X509Certificate}=require('node:crypto');const fingerprint='AE:A6:A4:79:7B:88:62:47:50:44:CA:AC:41:E2:44:84:4E:24:6F:C1:5A:D7:11:3F:F3:C2:2F:54:84:20:BA:D6';const pem=tls.getCACertificates('system').find(p=>new X509Certificate(p).fingerprint256===fingerprint);if(!pem)throw new Error('Verified Windows root CA not found');console.log(pem);") -join "`n"
if ($LASTEXITCODE -ne 0) { throw 'Trusted certificate lookup failed' }
```

This fingerprint is machine-specific, not a universal Norton root. Independently
verify any rotated/replacement certificate before changing it.

The optional BuildKit secret exists only during `npm ci`.
`NODE_EXTRA_CA_CERTS` adds that trust without disabling certificate verification.
Neither the CA mount nor its environment setting is included in the runtime.
`compose.trusted-ca.yaml` is an opt-in build override, not a runtime secret.

## Troubleshooting

- Port already in use: stop the other server or change Compose's host port.
- Unhealthy/exited service: inspect `docker compose logs app`, storage ownership
  and migration errors; do not delete the volume to hide the problem.
- Build success but old UI: rebuild the image and recreate the service; Docker
  runs production output and does not hot reload source changes.
- Preserve data when stopping/replacing containers. Back up before migrations.
