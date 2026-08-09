import { useRef, useState } from 'react'
import './FileDropZone.css'

const ACCEPT = '.txt,.log,.json,.md,.csv,.sql,.java,.py,.js,.ts,.html,.xml,.yml,.yaml,.properties,.pdf'

/**
 * Dashed drop zone for uploading a file (text formats or PDF).
 */
export default function FileDropZone({ file, onFileChange, disabled }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  function handleFiles(files) {
    if (files && files.length > 0) {
      onFileChange(files[0])
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    if (!disabled) handleFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`file-drop-zone ${dragging ? 'file-drop-zone--dragging' : ''} ${disabled ? 'file-drop-zone--disabled' : ''}`}
      onClick={() => !disabled && inputRef.current && inputRef.current.click()}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload a file"
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="file-input-hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />

      {file ? (
        <div className="file-drop-zone__selected">
          <span className="file-drop-zone__name">{file.name}</span>
          <button
            type="button"
            className="file-drop-zone__remove"
            onClick={(e) => {
              e.stopPropagation()
              onFileChange(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
            disabled={disabled}
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="file-drop-zone__empty">
          <span className="file-drop-zone__icon" aria-hidden="true">
            📄
          </span>
          <span>Drop a file here or click to browse</span>
          <span className="file-drop-zone__hint">Text logs, stack traces, SQL, or PDF</span>
        </div>
      )}
    </div>
  )
}
