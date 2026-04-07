import os

print('=== FINAL CASHFREE VERSION AUDIT ===')
old_versions = ['2022-09-01', '2023-08-01']
found_old = []
for d in ['functions/src', 'src']:
    for root, _, files in os.walk(d):
        for f in files:
            if f.endswith('.ts'):
                path = os.path.join(root, f)
                with open(path) as fh:
                    for i, line in enumerate(fh, 1):
                        for v in old_versions:
                            if v in line:
                                found_old.append(f'{path}:{i}: {line.rstrip()}')

if found_old:
    print('REMAINING OLD VERSIONS:')
    for r in found_old:
        print(' ', r)
else:
    print('All Cashfree API calls use v2025-01-01')

print()
print('=== SUPABASE TRACE AUDIT (non-markdown files) ===')
supabase_traces = []
skip_dirs = {'node_modules', '.git', 'playwright-report', 'test-results', 'docs'}
for root, dirs, files in os.walk('.'):
    dirs[:] = [x for x in dirs if x not in skip_dirs]
    for f in files:
        if f.endswith(('.ts', '.tsx', '.js', '.jsx', '.json')) and not f.endswith('.md'):
            path = os.path.join(root, f)
            try:
                with open(path) as fh:
                    for i, line in enumerate(fh, 1):
                        if 'supabase' in line.lower():
                            supabase_traces.append(f'{path}:{i}: {line.strip()}')
            except Exception:
                pass

if supabase_traces:
    print(f'Found {len(supabase_traces)} trace(s):')
    for t in supabase_traces:
        print(' ', t)
else:
    print('No Supabase traces in active code')

