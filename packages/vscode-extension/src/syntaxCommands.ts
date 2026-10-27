/**
 * Commands that convert .jot files between classic and compact syntax.
 *
 * Every conversion is verified: the converted text is parsed again and must have
 * exactly the same content as the original, otherwise the file is left untouched.
 */

import * as vscode from 'vscode';
import { convertSyntax, type SyntaxStyle } from '@jotx-labs/core';

const JOT_GLOB = '**/*.{jot,jotx,meet}';
const LABEL: Record<SyntaxStyle, string> = { compact: 'compact', classic: 'classic' };

/** The .jot file the user means: explicit argument, active text editor, or active jotx editor tab. */
function targetUri(uri?: vscode.Uri): vscode.Uri | undefined {
  if (uri) return uri;
  const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  if (input instanceof vscode.TabInputCustom || input instanceof vscode.TabInputText) return input.uri;
  return vscode.window.activeTextEditor?.document.uri;
}

/** Replace a file's text through VS Code so open editors (and undo) follow the change. */
async function writeText(uri: vscode.Uri, text: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  const edit = new vscode.WorkspaceEdit();
  edit.replace(uri, new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length)), text);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
}

async function convertOne(uri: vscode.Uri | undefined, style: SyntaxStyle, log: vscode.OutputChannel) {
  const target = targetUri(uri);
  if (!target || !/\.(jot|jotx|meet)$/.test(target.fsPath)) {
    vscode.window.showErrorMessage('Open a .jot file to convert it.');
    return;
  }
  const doc = await vscode.workspace.openTextDocument(target);
  const result = convertSyntax(doc.getText(), style);
  if (!result.ok) {
    log.appendLine(`❌ ${target.fsPath}: ${result.error}`);
    vscode.window.showErrorMessage(`This file was not converted: ${result.error}. It is unchanged.`);
    return;
  }
  if (!result.changed) {
    vscode.window.showInformationMessage(`This file already uses ${LABEL[style]} syntax.`);
    return;
  }
  await writeText(target, result.text);
  const saved = Math.round((1 - result.text.length / doc.getText().length) * 100);
  vscode.window.showInformationMessage(`Converted to ${LABEL[style]} syntax${saved > 0 ? ` (${saved}% smaller)` : ''}.`);
}

async function convertWorkspace(log: vscode.OutputChannel) {
  const pick = await vscode.window.showQuickPick([
    { label: 'Compact syntax', description: 'Smaller files, fewer AI tokens (jotx 3.1+)', style: 'compact' as SyntaxStyle },
    { label: 'Classic syntax', description: 'Readable by jotx 3.0 and earlier', style: 'classic' as SyntaxStyle }
  ], { placeHolder: 'Convert every .jot file in the workspace to…' });
  if (!pick) return;

  const files = await vscode.workspace.findFiles(JOT_GLOB, '**/node_modules/**');
  const plan: { uri: vscode.Uri; text: string }[] = [];
  const failed: string[] = [];
  let before = 0, after = 0;

  await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Checking .jot files…' }, async () => {
    for (const uri of files) {
      const original = Buffer.from(await vscode.workspace.fs.readFile(uri)).toString('utf8');
      const result = convertSyntax(original, pick.style);
      if (!result.ok) { failed.push(`${vscode.workspace.asRelativePath(uri)}: ${result.error}`); continue; }
      if (!result.changed) continue;
      plan.push({ uri, text: result.text });
      before += original.length;
      after += result.text.length;
    }
  });

  if (!plan.length) {
    vscode.window.showInformationMessage(failed.length
      ? `No files converted. ${failed.length} could not be converted safely; see the jotx output for details.`
      : `All ${files.length} .jot files already use ${LABEL[pick.style]} syntax.`);
    failed.forEach(f => log.appendLine(`❌ ${f}`));
    return;
  }

  const smaller = before ? Math.round((1 - after / before) * 100) : 0;
  const detail = [
    `${plan.length} of ${files.length} files will be rewritten${smaller > 0 ? `, ${smaller}% smaller overall` : ''}.`,
    failed.length ? `${failed.length} file(s) can't be converted safely and will be left as they are.` : '',
    'Each file is checked to read back with identical content before it is written.'
  ].filter(Boolean).join('\n');
  const choice = await vscode.window.showWarningMessage(`Convert to ${LABEL[pick.style]} syntax?`, { modal: true, detail }, 'Convert');
  if (choice !== 'Convert') return;

  for (const item of plan) {
    await writeText(item.uri, item.text);
    log.appendLine(`✅ ${vscode.workspace.asRelativePath(item.uri)} → ${LABEL[pick.style]}`);
  }
  failed.forEach(f => log.appendLine(`❌ ${f}`));
  vscode.window.showInformationMessage(`Converted ${plan.length} files to ${LABEL[pick.style]} syntax.`);
}

export function registerSyntaxCommands(context: vscode.ExtensionContext, log: vscode.OutputChannel) {
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.convertToCompactSyntax', (uri?: vscode.Uri) => convertOne(uri, 'compact', log)),
    vscode.commands.registerCommand('jotx.convertToClassicSyntax', (uri?: vscode.Uri) => convertOne(uri, 'classic', log)),
    vscode.commands.registerCommand('jotx.convertWorkspaceSyntax', () => convertWorkspace(log))
  );
}

/** Style for files jotx creates (new notes, Markdown imports). */
export function newFileSyntax(): SyntaxStyle {
  return vscode.workspace.getConfiguration('jotx').get<string>('syntax', 'preserve') === 'classic' ? 'classic' : 'compact';
}
