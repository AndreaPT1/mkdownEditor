# Windows SmartScreen release path

GitHub issue #10 reports that Microsoft Defender SmartScreen warns when users
download and run the Windows installer or executable.

## Current repository state

The project currently ships unsigned Windows artifacts. The Tauri config has a
Windows NSIS bundle, but no Authenticode signing configuration:

- `src-tauri/tauri.conf.json` defines `bundle.windows.nsis.installMode`.
- `.github/workflows/release.yml` builds releases on `windows-latest`.
- No certificate thumbprint, timestamp URL, signing command, PFX secret, Azure
  Artifact Signing account, or Azure Key Vault signing configuration is present.

Because the repository does not contain a signing identity, issue #10 cannot be
fully fixed by application code alone. Adding fake certificate settings would
make releases fail or imply a trust guarantee that the project does not have.

## Why SmartScreen appears

SmartScreen is reputation based. For apps distributed outside the Microsoft
Store, Windows considers both publisher reputation and file hash reputation.
Unsigned builds have the weakest trust signal. Signed builds show a verified
publisher, but new files can still warn until the publisher or file hash earns
enough positive reputation.

Useful references:

- Microsoft: https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/smartscreen-reputation
- Tauri Windows signing: https://v2.tauri.app/distribute/sign/windows/

## Paths to reduce or eliminate warnings

### Option 1: Microsoft Store

Publishing through the Microsoft Store is the most reliable way to avoid
SmartScreen download warnings because Store packages are signed by Microsoft.
This requires a Store distribution flow, which this repository does not
currently define.

### Option 2: Azure Artifact Signing

For non-Store distribution, Microsoft recommends Artifact Signing, formerly
Trusted Signing. This still requires identity validation and Azure setup outside
the repository.

External requirements:

1. Create and validate an Azure Artifact Signing account.
2. Create a certificate profile for the publisher identity.
3. Add GitHub Actions secrets for the Azure app registration:
   `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, and `AZURE_TENANT_ID`.
4. Add the real endpoint, account name, and certificate profile name to a Tauri
   Windows signing command.

Example Tauri configuration shape, using real values only:

```json
{
  "bundle": {
    "windows": {
      "signCommand": "trusted-signing-cli -e https://<region>.codesigning.azure.net -a <account> -c <profile> -d mkdownEditor %1"
    }
  }
}
```

Do not commit this with placeholders as the active release configuration. Keep it
as documentation or a separate local config until the real signing account is
ready.

### Option 3: Traditional OV/EV Authenticode certificate

A traditional code signing certificate can also be used. The private key must be
protected and should be supplied to CI through GitHub Actions secrets or a secure
signing service.

External requirements:

1. Acquire a code signing certificate from a trusted certificate authority.
2. Import the certificate on the Windows release runner or sign with a secure
   external signing command.
3. Configure Tauri with the real certificate thumbprint, digest algorithm, and
   timestamp server.

Example Tauri configuration shape, using real values only:

```json
{
  "bundle": {
    "windows": {
      "certificateThumbprint": "<sha1-thumbprint>",
      "digestAlgorithm": "sha256",
      "timestampUrl": "https://<certificate-authority-timestamp-url>"
    }
  }
}
```

## Release workflow checklist

Once the signing identity exists, update `.github/workflows/release.yml` for the
Windows matrix entry only:

1. Install or prepare the signing tool before `tauri-apps/tauri-action`.
2. Load signing credentials from GitHub Actions secrets.
3. Configure Tauri with real signing values or pass a Windows-specific signing
   config to the Tauri build.
4. Build the release on `windows-latest`.
5. Verify the produced `.exe` and `.msi` before publishing:

```powershell
Get-AuthenticodeSignature .\path\to\mkdownEditor_*_x64-setup.exe
signtool verify /pa /tw .\path\to\mkdownEditor_*_x64-setup.exe
```

Only close issue #10 after a Windows release artifact is signed by the real
publisher identity and verification succeeds. Even then, note that new signed
builds may still show SmartScreen warnings until reputation accumulates.

## User-facing release note

Until signed Windows releases are available, include this note with Windows
downloads:

> Windows Defender SmartScreen may warn that mkdownEditor is unrecognized because
> the current Windows release is not code signed. Only install releases downloaded
> from the official GitHub Releases page. The maintainer release path is to sign
> Windows artifacts with a trusted publisher identity and allow SmartScreen
> reputation to build over time.
