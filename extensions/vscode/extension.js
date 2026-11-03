const vscode = require('vscode');
const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const MARKDOWN = /\.(md|markdown|mdx)$/i;

function resolveCli(context) {
  const candidates = [
    path.join(context.extensionPath, '..', '..', 'packages', 'cli', 'bin', 'paragon.js'),
    path.join(context.extensionPath, 'node_modules', 'paragon-reader', 'bin', 'paragon.js'),
    path.join(context.extensionPath, 'paragon', 'bin', 'paragon.js'),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

async function openReader(context) {
  const editor = vscode.window.activeTextEditor;
  if (!editor || !MARKDOWN.test(editor.document.uri.fsPath)) {
    void vscode.window.showWarningMessage('Open a Markdown file first, then run Paragon Reader.');
    return;
  }
  if (editor.document.isUntitled) {
    void vscode.window.showWarningMessage('Save the file before opening it in Paragon Reader.');
    return;
  }
  if (editor.document.isDirty) await editor.document.save();

  const cli = resolveCli(context);
  if (!cli) {
    const action = await vscode.window.showErrorMessage(
      'Paragon Reader CLI was not found. Run `npm run build` in the repository, or install `paragon-reader`.',
      'Open install guide',
    );
    if (action === 'Open install guide') {
      void vscode.env.openExternal(
        vscode.Uri.parse('https://github.com/mrmajdi/ParagonAIMag-MD-Reader#quick-start'),
      );
    }
    return;
  }

  const child = spawn(process.execPath, [cli, editor.document.uri.fsPath], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  void vscode.window.setStatusBarMessage('Paragon Reader: opening in your browser…', 4000);
}

function activate(context) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 40);
  status.text = '$(book-open) Paragon';
  status.tooltip = 'Open this Markdown file in Paragon Reader';
  status.command = 'paragon.openReader';
  status.show();
  context.subscriptions.push(status);

  context.subscriptions.push(
    vscode.commands.registerCommand('paragon.openReader', () => openReader(context)),
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
