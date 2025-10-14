## Kubernetes Misconfiguration Scanner (Flask)

### Overview
A lightweight Flask service that clones a given GitHub repository and scans Kubernetes manifests (YAML/JSON) for risky configurations (misconfigurations). It returns a concise JSON report including file path, line number, and matched rule.

### Requirements
- Python 3.9+
- Git installed on the system

### Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Run
You can configure host/port/debug/clone directory via environment variables. Defaults are provided.
```bash
# Optional environment variables
export APP_HOST=0.0.0.0
export APP_PORT=8282
export APP_DEBUG=true
export CLONE_BASE_DIR=/data/repos

python main.py
```

### Configuration (Environment Variables)
- APP_HOST: Server bind host (default: 0.0.0.0)
- APP_PORT: Server port (default: 8282)
- APP_DEBUG: Debug mode on (accepted: 1/true/yes) (default: false)
- CLONE_BASE_DIR: Base directory for cloning repositories (default: /tmp/kube-scan)

### Endpoints
- GET `/` – Basic service info
- GET `/healthy` – Health check (JSON). If the internal docs file is missing, returns `{ "status": "ok" }`
- GET `/scan?repo-url=...` – Clone the GitHub repository and scan it
  - Query parameters:
    - repo-url (required): GitHub URL. URL-encoding is recommended

### cURL Examples
```bash
# Example 1) URL-encoded
curl 'http://127.0.0.1:8282/scan?repo-url=https%3A%2F%2Fgithub.com%2Fkubernetes%2Fexamples'

# Example 2) Without encoding (you may need to escape special characters)
curl "http://127.0.0.1:8282/scan?repo-url=https://github.com/kubernetes/examples"
```

### Expected Response (Success)
```json
{
  "repoUrl": "https://github.com/kubernetes/examples",
  "stats": {
    "filesScanned": 42,
    "findings": 3
  },
  "findings": [
    {
      "filePath": "/tmp/kube-scan/123e4567/.../deploy/app.yaml",
      "lineNumber": 27,
      "ruleId": "privileged_true",
      "matchedText": "securityContext: { privileged: true }"
    },
    {
      "filePath": "/tmp/kube-scan/123e4567/.../svc.yaml",
      "lineNumber": 5,
      "ruleId": "service_type_NodePort",
      "matchedText": "type: NodePort"
    }
  ]
}
```

### Expected Response (Error)
- Missing parameter
```json
{ "error": "repo-url parameter is required" }
```

- Invalid GitHub URL
```json
{ "error": "Invalid GitHub URL." }
```

### Scanning Rules (Highlights)
The scanner uses whitespace/case-tolerant regex to detect risky configs, including:
- `privileged: true`
- `hostNetwork: true`, `hostPID: true`, `hostIPC: true`
- `allowPrivilegeEscalation: true`
- `runAsNonRoot: false`, `runAsUser: 0`, `runAsGroup: 0`
- `readOnlyRootFilesystem: false`
- `automountServiceAccountToken: true`
- `serviceAccountName: default`
- `hostPath: ...` usage
- `hostPort: <number>` usage
- `Service.type: NodePort`
- `shareProcessNamespace: true`
- `dnsPolicy: ClusterFirstWithHostNet`
- `seccompProfile.type: Unconfined`
- AppArmor annotation `.../kubernetes.io/...: unconfined`
- `capabilities.add` includes `SYS_ADMIN` / `ALL` / `NET_ADMIN` (inline and multi-line)

Supported extensions: `.yaml`, `.yml`, `.json`

Skipped directories: `.git`, `.hg`, `.svn`, `node_modules`, `venv`, `.venv`, `__pycache__`

### How It Works
1) Receive request → 2) Clone repository to `CLONE_BASE_DIR/<UUID>` → 3) Scan all supported files → 4) Return JSON results → 5) Cleanup cloned directory

### Project Structure
```
.
├─ controllers/
│  ├─ scan_controller.py        # /scan endpoint (Blueprint)
│  └─ system_controller.py      # /, /healthy endpoints (Blueprint)
├─ services/
│  ├─ repo_service.py           # GitHub URL validation / clone / cleanup
│  └─ scan_service.py           # Scanning logic
├─ main.py                      # Flask app & blueprint registration
├─ config.py                    # Environment-based configuration
├─ requirements.txt
└─ README.md
```
