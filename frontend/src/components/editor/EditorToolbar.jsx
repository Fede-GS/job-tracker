import { useTranslation } from 'react-i18next';

export default function EditorToolbar({ editor }) {
  const { t } = useTranslation();
  if (!editor) return null;

  const btn = (action, isActive, label) => (
    <button
      type="button"
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
      onClick={action}
      title={label}
    >
      {label}
    </button>
  );

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'B')}
        {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'I')}
        {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'U')}
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        {btn(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), editor.isActive('heading', { level: 1 }), 'H1')}
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive('heading', { level: 2 }), 'H2')}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive('heading', { level: 3 }), 'H3')}
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), '•')}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), '1.')}
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), '⫷')}
        {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), '⫸')}
        {btn(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), '⫸')}
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-group">
        {btn(() => editor.chain().focus().undo().run(), false, '↩')}
        {btn(() => editor.chain().focus().redo().run(), false, '↪')}
      </div>
    </div>
  );
}
