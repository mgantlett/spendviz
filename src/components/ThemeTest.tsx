import React from 'react';

export const ThemeTest = () => {
  return (
    <div className="fixed top-0 right-0 m-4 p-4 bg-white dark:bg-black text-black dark:text-white border rounded">
      Theme Test: 
      <span className="ml-2 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded">
        {document.documentElement.classList.contains('dark') ? 'Dark' : 'Light'}
      </span>
    </div>
  );
};
