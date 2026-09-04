const fs = require('fs');

let vaultCode = fs.readFileSync('src/pages/LifeVault.tsx', 'utf-8');

if (!vaultCode.includes('isEditingItem')) {
  // Add state
  vaultCode = vaultCode.replace(
    "const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);",
    "const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);\n  const [isEditingItem, setIsEditingItem] = useState(false);\n  const [editFormData, setEditFormData] = useState<any>({});"
  );
  
  // Update setSelectedItem usage to also clear edit state
  vaultCode = vaultCode.replace(
    "onClick={() => setSelectedItem(null)}",
    "onClick={() => { setSelectedItem(null); setIsEditingItem(false); }}"
  );
  
  // We need to inject the edit UI inside the selectedItem modal.
  // The current modal is: {selectedItem && ( ... <div className="bg-white ..."> ... )}
  // We'll replace the content inside. Let's do this carefully.
}
