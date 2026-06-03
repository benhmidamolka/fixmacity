const fs = require('fs');
const path = require('path');

const files = [
  '../src/pages/Citizen/NouveauSignalement.tsx',
  '../src/pages/Citizen/Propositions.tsx'
];

const replacements = [
  { regex: /(?<!dark:)bg-white/g, replacement: 'bg-white dark:bg-slate-900' },
  { regex: /(?<!dark:)bg-slate-50/g, replacement: 'bg-slate-50 dark:bg-slate-800' },
  { regex: /(?<!dark:)text-slate-500/g, replacement: 'text-slate-500 dark:text-slate-400' },
  { regex: /(?<!dark:)text-slate-600/g, replacement: 'text-slate-600 dark:text-slate-300' },
  { regex: /(?<!dark:)text-\[#0A1628\]/g, replacement: 'text-[#0A1628] dark:text-white' },
  { regex: /(?<!dark:)border-slate-100/g, replacement: 'border-slate-100 dark:border-slate-800' },
  { regex: /(?<!dark:)border-slate-200/g, replacement: 'border-slate-200 dark:border-slate-700' },
  { regex: /(?<!dark:)hover:bg-slate-50/g, replacement: 'hover:bg-slate-50 dark:hover:bg-slate-800' },
  { regex: /(?<!dark:)bg-slate-100/g, replacement: 'bg-slate-100 dark:bg-slate-700' },
  { regex: /(?<!dark:)border-b border-slate-50/g, replacement: 'border-b border-slate-50 dark:border-slate-800' }
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;
  
  // Apply regexes
  replacements.forEach(({ regex, replacement }) => {
    // Avoid double replacements if run multiple times
    content = content.replace(regex, (match) => {
      // If the string already contains the dark class right after, don't replace
      return match; // We actually need a better way to prevent double additions
    });
  });
  
  // Better logic to avoid double replacement:
  replacements.forEach(({ regex, replacement }) => {
     // A simple string replace won't avoid doubles easily without complex regex, 
     // so let's do a trick: first remove the dark version if it exists, then replace the base version with base + dark
     const darkClass = replacement.split(' ')[1];
     const baseClass = replacement.split(' ')[0];
     
     // Remove existing dark classes that we are about to add, to be safe
     const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
     const darkRegex = new RegExp(' ' + escapeRegExp(darkClass), 'g');
     content = content.replace(darkRegex, '');
     
     // Now replace the base class with base + dark class
     const baseRegex = new RegExp(escapeRegExp(baseClass), 'g');
     content = content.replace(baseRegex, replacement);
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated: ${file}`);
  } else {
    console.log(`No changes needed for: ${file}`);
  }
});
