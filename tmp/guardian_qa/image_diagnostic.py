import sys, json, re, base64
from openai.types import ImagesResponse
sys.path.insert(0, '/Users/hong/.codex/skills/imagecreate/scripts')
import image_gen
original_client = image_gen._create_client
def json_client():
    client = original_client()
    def edit(**payload):
        files = payload['image']
        if not isinstance(files, list): files = [files]
        payload['image'] = ['data:image/png;base64,' + base64.b64encode(f.read()).decode('ascii') for f in files]
        return client.post('/images/edits', body=payload, cast_to=ImagesResponse)
    client.images.edit = edit
    return client
image_gen._create_client = json_client
try:
    image_gen.main()
except Exception as exc:
    body = getattr(exc, 'body', None)
    err = body.get('error', body) if isinstance(body, dict) else {}
    if not isinstance(err, dict):
        err = {'message': str(err)}
    safe = {k: str(err.get(k, ''))[:600] for k in ('type', 'code', 'param', 'message')}
    secret = getattr(image_gen._PROVIDER, 'api_key', '')
    for k, v in safe.items():
        if secret:
            v = v.replace(secret, '[redacted]')
        safe[k] = re.sub(r'(?:sk-|Bearer\s+)[A-Za-z0-9_-]+', '[redacted]', v)
    print(json.dumps({'status': getattr(exc, 'status_code', None), 'error': safe}, ensure_ascii=False))
    raise SystemExit(1)
