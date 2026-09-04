const fs = require('fs');
let content = fs.readFileSync('src/pages/Copilot.tsx', 'utf8');

if (!content.includes('OnePlaceExecutionModal')) {
  content = content.replace("import { CopilotAttachment } from '../types';", "import { CopilotAttachment } from '../types';\nimport { OnePlaceExecutionModal, ExecutionPayload } from '../components/execution/OnePlaceExecutionModal';");
}

const regexState = /const fileInputRef = useRef<HTMLInputElement>\(null\);/;
const replacementState = `const fileInputRef = useRef<HTMLInputElement>(null);
  const [executionPayload, setExecutionPayload] = useState<ExecutionPayload | null>(null);`;
content = content.replace(regexState, replacementState);

const regexMsg = /{!isUser && msg\.suggestedActions && msg\.suggestedActions\.length > 0 && \(/;
const replacementMsg = `{!isUser && msg.executionPayload && (
                    <div className="pt-2">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Action Ready: {msg.executionPayload.title || 'Execute workflow'}</span>
                        </div>
                        <button 
                          onClick={() => setExecutionPayload(msg.executionPayload)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm"
                        >
                          Review & Execute
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (`

content = content.replace(regexMsg, replacementMsg);

const regexModal = /<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\};/;
const replacementModal = `      <OnePlaceExecutionModal 
        isOpen={!!executionPayload}
        onClose={() => setExecutionPayload(null)}
        payload={executionPayload || {} as ExecutionPayload}
        onExecute={() => {
          if (executionPayload) {
            setCopilotMessages(prev => [...prev, {
              id: \`msg_\${Date.now()}_sys\`,
              sender: 'system',
              content: \`✅ Successfully executed: **\${executionPayload.title}**\`,
              timestamp: new Date().toISOString()
            }]);
          }
        }}
      />
    </div>
  </div>
</div>
</div>
  );
};`;
content = content.replace(regexModal, replacementModal);

fs.writeFileSync('src/pages/Copilot.tsx', content);
console.log('Patched Copilot.tsx');
