import * as vscode from 'vscode';
import { NoteEditorProvider } from './NoteEditorProvider';
import { GraphViewProvider } from './graph/GraphViewProvider';
import { setupJotxLanguageForVSCode } from '@jotx-labs/language';
import { parse, serialize, jotToMarkdown, markdownToJot } from '@jotx-labs/core';
import { registerStandardBlocks } from '@jotx-labs/standard-lib';
import { registerSyntaxCommands, newFileSyntax } from './syntaxCommands';
import * as path from 'path';
import * as fs from 'fs';

// Create output channel for logging
const outputChannel = vscode.window.createOutputChannel('jotx');

// Module-level variable to store NodeManager instance
// (workspaceState serializes to JSON and loses methods!)
let globalNodeManager: any = null;
let nodeManagerReadyResolve: (() => void) | null = null;
let nodeManagerReadyPromise: Promise<void> = new Promise((resolve) => {
  nodeManagerReadyResolve = resolve;
});

export async function activate(context: vscode.ExtensionContext) {
  outputChannel.show(true);
  outputChannel.appendLine('🚀 Jotx extension activating...');

  // Register standard blocks
  outputChannel.appendLine('📦 Registering standard blocks...');
  registerStandardBlocks();
  outputChannel.appendLine('✅ Standard blocks registered');

  // Setup language support (syntax highlighting + diagnostics)
  outputChannel.appendLine('📝 Setting up jotx language support...');
  const languageProvider = setupJotxLanguageForVSCode(vscode, context);
  outputChannel.appendLine('✅ Language support active (syntax + diagnostics)');

  // Initialize NodeManager
  outputChannel.appendLine('🔍 Initializing NodeManager...');
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (workspaceFolder) {
    (async () => {
      try {
        const { VSCodeNodeManager } = await import('./core');
        const nodeManager = new VSCodeNodeManager();
        await nodeManager.initialize(workspaceFolder);
        context.subscriptions.push(nodeManager);

        // Store in module variable (NOT workspaceState - it strips methods!)
        globalNodeManager = nodeManager;
        // Resolve the ready promise so waitForNodeManager() can return
        if (nodeManagerReadyResolve) nodeManagerReadyResolve();
        outputChannel.appendLine('✅ NodeManager initialized and stored globally');
      } catch (error: any) {
        outputChannel.appendLine(`⚠️  NodeManager init failed: ${error.message}`);
      }
    })();
  }

  // Register custom editor provider
  const provider = NoteEditorProvider.register(context, outputChannel);
  context.subscriptions.push(provider);
  outputChannel.appendLine('✅ Custom editor provider registered');

  // Register graph view provider
  context.subscriptions.push(GraphViewProvider.register(context));
  outputChannel.appendLine('✅ Graph view provider registered');

  // Register open with jotx command
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.openWithJotx', async (uri?: vscode.Uri) => {
      outputChannel.appendLine('🔧 Open with jotx command triggered');

      if (!uri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('No file open');
          return;
        }
        uri = editor.document.uri;
      }

      outputChannel.appendLine(`Opening: ${uri.toString()}`);

      try {
        await vscode.commands.executeCommand('vscode.openWith', uri, 'jotx.noteEditor');
        outputChannel.appendLine('✅ File opened with jotx editor');
      } catch (error) {
        outputChannel.appendLine(`❌ Error: ${error}`);
        vscode.window.showErrorMessage(`Failed to open with jotx: ${error}`);
      }
    })
  );
  outputChannel.appendLine('✅ Open with jotx command registered');

  // Register create note command
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.createNote', async () => {
      const title = await vscode.window.showInputBox({
        prompt: 'Enter note title',
        placeHolder: 'My Note'
      });

      if (!title) return;

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a folder first');
        return;
      }

      const filename = title.toLowerCase().replace(/\s+/g, '-') + '.jot';
      const filePath = require('path').join(workspaceFolder.uri.fsPath, filename);
      const uri = vscode.Uri.file(filePath);

      // New notes are written in the configured syntax (compact unless jotx.syntax is "classic")
      const content = serialize({
        document: {
          id: title.replace(/[^a-zA-Z0-9]+/g, '_') || 'note',
          type: 'jotx',
          metadata: { title, created: new Date().toISOString() },
          blocks: [
            { id: 'title', type: 'heading', properties: { text: title, level: 1 }, children: [] },
            { id: 'intro', type: 'paragraph', properties: { text: 'Start writing...' }, children: [] }
          ]
        },
        errors: []
      } as any, { style: newFileSyntax() });

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document);
    })
  );

  outputChannel.appendLine('✅ Create note command registered');

  // Classic <-> compact syntax conversion
  registerSyntaxCommands(context, outputChannel);

  // Register show logs command
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.showLogs', () => {
      outputChannel.show();
    })
  );
  outputChannel.appendLine('✅ Show logs command registered');

  // Register open help command
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.openHelp', async () => {
      outputChannel.appendLine('📚 Opening help files...');

      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('Please open a folder first to access help files');
        return;
      }

      const path = require('path');
      const fs = require('fs');

      // Destination folder in user's workspace
      const helpFolderPath = path.join(workspaceFolder.uri.fsPath, 'jotx-help');
      const helpFolderUri = vscode.Uri.file(helpFolderPath);

      try {
        // Delete existing folder if it exists (to ensure clean overwrite)
        if (fs.existsSync(helpFolderPath)) {
          outputChannel.appendLine(`🗑️ Removing existing jotx-help folder...`);
          await vscode.workspace.fs.delete(helpFolderUri, { recursive: true });
        }

        // Source folder from extension bundle
        const extensionHelpPath = path.join(context.extensionPath, 'out', 'jotx-help');

        if (!fs.existsSync(extensionHelpPath)) {
          outputChannel.appendLine(`⚠️ Extension help path not found: ${extensionHelpPath}`);
          vscode.window.showErrorMessage('Help files not found in extension bundle');
          return;
        }

        // Recursive copy function
        const copyRecursive = async (src: string, dest: string) => {
          const stats = fs.statSync(src);

          if (stats.isDirectory()) {
            // Create destination directory
            const destUri = vscode.Uri.file(dest);
            await vscode.workspace.fs.createDirectory(destUri);

            // Recursively copy contents
            const items = fs.readdirSync(src);
            for (const item of items) {
              const srcPath = path.join(src, item);
              const destPath = path.join(dest, item);
              await copyRecursive(srcPath, destPath);
            }
          } else {
            // Copy file
            const content = fs.readFileSync(src);
            const destUri = vscode.Uri.file(dest);
            await vscode.workspace.fs.writeFile(destUri, content);
            outputChannel.appendLine(`✅ Copied: ${path.relative(extensionHelpPath, src)}`);
          }
        };

        // Copy entire jotx-help folder recursively (includes templates, examples, etc.)
        await copyRecursive(extensionHelpPath, helpFolderPath);
        outputChannel.appendLine(`✅ Successfully copied jotx-help folder with all subdirectories`);

        // Open JOTX_FOR_HUMANS.jot for quick reference
        const humanHelpUri = vscode.Uri.file(path.join(helpFolderPath, 'JOTX_FOR_HUMANS.jot'));
        const document = await vscode.workspace.openTextDocument(humanHelpUri);
        await vscode.window.showTextDocument(document);

        vscode.window.showInformationMessage('📚 jotx help files (including templates & examples) are ready in your workspace!');
        outputChannel.appendLine('🎉 Help files opened successfully');

      } catch (error) {
        outputChannel.appendLine(`❌ Error opening help files: ${error}`);
        vscode.window.showErrorMessage(`Failed to open help files: ${error}`);
      }
    })
  );
  outputChannel.appendLine('✅ Open help command registered');

  // Register export to Markdown command
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.exportToMarkdown', async (uri?: vscode.Uri) => {
      outputChannel.appendLine('📤 Export to Markdown command triggered');

      // Get the active document
      if (!uri) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
          vscode.window.showErrorMessage('No file open to export');
          return;
        }
        uri = editor.document.uri;
      }

      // Check if it's a jotx file
      const ext = path.extname(uri.fsPath);
      if (!['.jot', '.page', '.todo', '.jotx'].includes(ext)) {
        vscode.window.showErrorMessage('Can only export .jot, .page, or .todo files');
        return;
      }

      try {
        // Read the jotx file
        const document = await vscode.workspace.openTextDocument(uri);
        const jotxContent = document.getText();

        // Parse to AST
        const ast = parse(jotxContent);

        if (ast.errors.length > 0) {
          vscode.window.showWarningMessage('Document has errors, but will attempt export anyway');
        }

        // Convert to Markdown
        const markdown = jotToMarkdown(ast);

        // Generate output filename
        const baseName = path.basename(uri.fsPath, ext);
        const dirName = path.dirname(uri.fsPath);
        const outputPath = path.join(dirName, `${baseName}.md`);
        const outputUri = vscode.Uri.file(outputPath);

        // Write Markdown file
        await vscode.workspace.fs.writeFile(outputUri, Buffer.from(markdown, 'utf-8'));

        // Open the exported file
        const mdDocument = await vscode.workspace.openTextDocument(outputUri);
        await vscode.window.showTextDocument(mdDocument);

        vscode.window.showInformationMessage(`✅ Exported to ${baseName}.md`);
        outputChannel.appendLine(`✅ Exported: ${uri.fsPath} → ${outputPath}`);

      } catch (error) {
        outputChannel.appendLine(`❌ Export error: ${error}`);
        vscode.window.showErrorMessage(`Failed to export: ${error}`);
      }
    })
  );
  outputChannel.appendLine('✅ Export to Markdown command registered');

  // Register import from Markdown command
  context.subscriptions.push(
    vscode.commands.registerCommand('jotx.importFromMarkdown', async (uri?: vscode.Uri) => {
      outputChannel.appendLine('📥 Import from Markdown command triggered');

      // Get the active document or prompt for file
      if (!uri) {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
          uri = editor.document.uri;
        } else {
          // Show file picker
          const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
              'Markdown': ['md', 'markdown']
            },
            title: 'Select Markdown file to import'
          });

          if (!files || files.length === 0) {
            return;
          }
          uri = files[0];
        }
      }

      // Check if it's a markdown file
      const ext = path.extname(uri.fsPath);
      if (!['.md', '.markdown'].includes(ext)) {
        vscode.window.showErrorMessage('Can only import .md or .markdown files');
        return;
      }

      try {
        // Read the Markdown file
        const document = await vscode.workspace.openTextDocument(uri);
        const markdownContent = document.getText();

        // Convert to Jotx AST
        const baseName = path.basename(uri.fsPath, ext);
        const documentId = baseName.replace(/[^a-zA-Z0-9]/g, '_');
        const ast = await markdownToJot(markdownContent, documentId);

        // Serialize to jotx format
        const jotxContent = serialize(ast, { style: newFileSyntax() });

        // Generate output filename
        const dirName = path.dirname(uri.fsPath);
        const outputPath = path.join(dirName, `${baseName}.jot`);
        const outputUri = vscode.Uri.file(outputPath);

        // Check if file exists
        let shouldWrite = true;
        if (fs.existsSync(outputPath)) {
          const answer = await vscode.window.showWarningMessage(
            `${baseName}.jot already exists. Overwrite?`,
            'Yes', 'No'
          );
          shouldWrite = answer === 'Yes';
        }

        if (shouldWrite) {
          // Write jotx file
          await vscode.workspace.fs.writeFile(outputUri, Buffer.from(jotxContent, 'utf-8'));

          // Open the imported file with jotx editor
          await vscode.commands.executeCommand('vscode.openWith', outputUri, 'jotx.noteEditor');

          vscode.window.showInformationMessage(`✅ Imported as ${baseName}.jot`);
          outputChannel.appendLine(`✅ Imported: ${uri.fsPath} → ${outputPath}`);
        }

      } catch (error) {
        outputChannel.appendLine(`❌ Import error: ${error}`);
        vscode.window.showErrorMessage(`Failed to import: ${error}`);
      }
    })
  );
  outputChannel.appendLine('✅ Import from Markdown command registered');

  outputChannel.appendLine('🎉 jotx is ready! Create or open a .jot file to get started.');
  outputChannel.appendLine('');
  outputChannel.appendLine('📝 To use jotx:');
  outputChannel.appendLine('   • Create a file with .jot extension - it opens automatically in jotx editor');
  outputChannel.appendLine('   • Or run command: "jotx: Create New Note"');
  outputChannel.appendLine('');
}

export function deactivate() {
  outputChannel.appendLine('👋 jotx deactivated');
  outputChannel.dispose();
}


// Export function to access NodeManager from other modules
export function getNodeManager() {
  return globalNodeManager;
}

// Wait for NodeManager to be ready (with timeout)
export async function waitForNodeManager(timeoutMs: number = 5000): Promise<any> {
  if (globalNodeManager) return globalNodeManager;

  // Wait for initialization with timeout
  await Promise.race([
    nodeManagerReadyPromise,
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
  ]);

  return globalNodeManager;
}
