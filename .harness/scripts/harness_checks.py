"""Local evidence helpers; no network, commits or permission changes."""
import argparse
import datetime as dt
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def git(repo, *args):
    return subprocess.run(['git', '-C', str(repo), *args], check=True,
                          capture_output=True, text=True).stdout.strip()

def snapshot(repo):
    root = Path(git(repo, 'rev-parse', '--show-toplevel')).resolve()
    if root != Path(repo).resolve():
        raise ValueError('repo must be the application repository root')
    if git(root, 'status', '--porcelain', '--untracked-files=all'):
        raise ValueError('resolve pending source changes before submission')
    return {'repository': str(root), 'head': git(root, 'rev-parse', 'HEAD'),
            'tree': git(root, 'rev-parse', 'HEAD^{tree}')}

def capture(repo):
    return {'schema': 1, 'recorded_at': now(), **snapshot(repo)}

def verify(repo, record):
    data = json.loads(Path(record).read_text(encoding='utf-8'))
    current = snapshot(repo)
    if data.get('schema') != 1:
        raise ValueError('unsupported revision schema')
    for key in ('head', 'tree'):
        if not isinstance(data.get(key), str) or not re.fullmatch(r'[0-9a-f]{40}|[0-9a-f]{64}', data[key]):
            raise ValueError('invalid full ' + key)
    for key in current:
        if data.get(key) != current[key]:
            raise ValueError('revision mismatch: ' + key)
    return {'checked_at': now(), 'verdict': 'pass', **current}

def preflight(repo, browser=None):
    root = Path(git(repo, 'rev-parse', '--show-toplevel')).resolve()
    if root != Path(repo).resolve():
        raise ValueError('repo must be the application repository root')
    checks = {'repository': str(root), 'git': git(root, '--version'),
              'status': git(root, 'status', '--porcelain'),
              'git_write_permission': 'unverified: first authorized real commit in worker sandbox',
              'effective_models': 'unverified: inspect actual parent/child runtime metadata'}
    if browser:
        executable = shutil.which(browser)
        if not executable:
            raise ValueError('browser executable missing: ' + browser)
        checks['browser'] = subprocess.run([executable, '--version'], check=True,
                                          capture_output=True, text=True).stdout.strip()
        if shutil.which('fc-match'):
            checks['japanese_font_candidate'] = subprocess.run(
                ['fc-match', '-f', '%{family}', ':lang=ja'], check=True,
                capture_output=True, text=True).stdout.strip()
        checks['rendering'] = 'unverified: inspect actual Japanese screenshot'
        checks['network_isolation'] = 'unverified: use approved test environment'
    return {'checked_at': now(), 'verdict': 'inventory-only', 'checks': checks}

def metrics(paths):
    rows = {}
    for path in paths:
        row = None
        malformed = 0
        with Path(path).open(encoding='utf-8') as stream:
            for line in stream:
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    malformed += 1
                    continue
                if not isinstance(event, dict):
                    malformed += 1
                    continue
                payload = event.get('payload') or {}
                if not isinstance(payload, dict):
                    continue
                if event.get('type') == 'session_meta':
                    row = {'session_id': payload.get('id'), 'source_file': str(Path(path).resolve()),
                           'role': payload.get('agent_role') or 'parent',
                           'started_at': payload.get('timestamp'), 'wait_calls': 0}
                if row is None:
                    continue
                if event.get('type') == 'turn_context':
                    row.update(model=payload.get('model'), effort=payload.get('effort'))
                if event.get('type') == 'event_msg' and payload.get('type') == 'token_count':
                    usage = (payload.get('info') or {}).get('total_token_usage')
                    if isinstance(usage, dict):
                        row['usage'] = {k: v for k, v in usage.items()
                                        if k in ('input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens')
                                        and type(v) is int and v >= 0}
                if event.get('type') == 'event_msg' and payload.get('type') == 'task_complete':
                    row['last_completed_at'] = event.get('timestamp')
                if event.get('type') == 'response_item' and payload.get('type') == 'function_call' and payload.get('name') == 'wait_agent':
                    row['wait_calls'] += 1
        if not row or not row.get('session_id'):
            raise ValueError('session metadata missing: ' + str(path))
        row['malformed_lines'] = malformed
        if row['session_id'] in rows:
            raise ValueError('duplicate session: ' + row['session_id'])
        rows[row['session_id']] = row
    keys = ('input_tokens', 'cached_input_tokens', 'output_tokens', 'reasoning_output_tokens', 'total_tokens')
    totals = {key: sum((r.get('usage') or {}).get(key, 0) or 0 for r in rows.values()) for key in keys}
    return {'recorded_at': now(), 'sessions': list(rows.values()), 'recorded_counter_sum': totals,
            'missing_usage_sessions': [r['session_id'] for r in rows.values() if not r.get('usage')],
            'missing_usage_fields': {r['session_id']: [k for k in keys if k not in (r.get('usage') or {})] for r in rows.values()},
            'scope': 'Explicit sessions only. Last cumulative counter per session. Cache is a subset of input; '
                     'reasoning may be a subset of output. Not prices, active time or context length. '
                     'Missing usage is unknown. No conversation or reasoning text exported.'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['capture', 'verify', 'preflight', 'metrics'])
    parser.add_argument('--repo', default='.')
    parser.add_argument('--record')
    parser.add_argument('--browser')
    parser.add_argument('--session', action='append', default=[])
    parser.add_argument('--output')
    args = parser.parse_args()
    try:
        if args.command == 'capture':
            result = capture(args.repo)
        elif args.command == 'verify':
            if not args.record:
                raise ValueError('--record required')
            result = verify(args.repo, args.record)
        elif args.command == 'preflight':
            result = preflight(args.repo, args.browser)
        else:
            if not args.session:
                raise ValueError('--session required')
            result = metrics(args.session)
        rendered = json.dumps(result, ensure_ascii=False, indent=2) + '\n'
        if args.output:
            target = Path(args.output).resolve()
            if args.command in ('capture', 'verify', 'preflight'):
                repo = Path(args.repo).resolve()
                relative = target.relative_to(repo)
                if not relative.parts or relative.parts[0] != 'evidence':
                    raise ValueError('output must be under ignored evidence/')
                if git(repo, 'ls-files', '--', str(relative)):
                    raise ValueError('output is tracked')
                subprocess.run(['git', '-C', str(repo), 'check-ignore', '-q', '--', str(relative)], check=True)
            target.parent.mkdir(parents=True, exist_ok=True)
            with target.open('x', encoding='utf-8') as stream:
                stream.write(rendered)
        print(rendered, end='')
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print('FAIL: ' + str(error), file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())

