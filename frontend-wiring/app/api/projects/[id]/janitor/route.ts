import { NextResponse } from 'next/server';

const CHECK_SERVICE_URL = process.env.CHECK_SERVICE_URL ?? 'http://localhost:3005';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY ?? 'triefrog-internal-dev';

// Mock fallback data
const MOCK_JANITOR_REPORT = {
  projectId: 'demo',
  cleanlinessScore: 68,
  aiMessRisk: 'High',
  safeFixes: [
    { id: '1', category: 'missing-readme', riskLevel: 'safe', title: 'README needs updating', description: 'The README does not reflect the current project structure.', affectedFiles: ['README.md'], suggestedFix: 'Regenerate README from current project structure', canAutoFix: true },
    { id: '2', category: 'stale-todos', riskLevel: 'safe', title: '3 stale TODO comments found', description: 'Found TODO comments that have not been addressed.', affectedFiles: ['src/api/users.ts', 'src/components/Auth.tsx'], suggestedFix: 'Review and resolve or remove TODO comments', canAutoFix: false },
    { id: '3', category: 'unused-files', riskLevel: 'safe', title: '2 potentially unused files', description: 'These files have no inbound references in the project graph.', affectedFiles: ['src/utils/legacy.ts', 'src/components/OldButton.tsx'], suggestedFix: 'Verify and remove if truly unused', canAutoFix: false },
  ],
  reviewFixes: [
    { id: '4', category: 'missing-tests', riskLevel: 'review', title: 'No test files detected', description: 'The project has no test files. AI-generated code often lacks test coverage.', affectedFiles: [], suggestedFix: 'Add unit tests for critical paths: auth, payments, API routes', canAutoFix: false },
    { id: '5', category: 'missing-error-handling', riskLevel: 'review', title: '3 API routes missing error handling', description: 'These routes do not appear to have error handling middleware.', affectedFiles: ['src/api/checkout.ts', 'src/api/webhooks.ts', 'src/api/users.ts'], suggestedFix: 'Add try/catch and proper HTTP error responses', canAutoFix: false },
    { id: '6', category: 'duplicate-components', riskLevel: 'review', title: 'Possible duplicate components', description: 'Found components with very similar names that may be duplicates.', affectedFiles: ['src/components/Button.tsx', 'src/components/Btn.tsx'], suggestedFix: 'Consolidate into a single reusable component', canAutoFix: false },
  ],
  doNotAutoFix: ['Auth & authentication logic', 'Payment processing code', 'Database migrations', 'Permission & RBAC systems', 'Production environment config', 'Security middleware', 'Encryption & token handling'],
  allFindings: [],
  summary: 'TrieFrog found 6 issues: 3 safe fixes and 3 areas needing review. The biggest risks are missing test coverage and API routes without error handling.',
  scannedAt: new Date().toISOString(),
  stats: { totalFindings: 6, safeCount: 3, reviewCount: 3, highCount: 0, canAutoFixCount: 1 },
};

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const res = await fetch(`${CHECK_SERVICE_URL}/projects/${id}/janitor`, {
      headers: { 'x-internal-key': INTERNAL_KEY },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`check-service ${res.status}`);
    const data = await res.json();
    return NextResponse.json({ data });
  } catch (err) {
    console.warn(`[/api/projects/${id}/janitor] Backend unavailable:`, err);
    return NextResponse.json({ data: { ...MOCK_JANITOR_REPORT, projectId: id } });
  }
}
