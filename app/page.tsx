import ExcelViewer from '@/components/ExcelViewer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col p-4">
      <h1 className="text-2xl font-bold mb-4">Excel Sheet Viewer</h1>
      <ExcelViewer />
    </main>
  );
}
