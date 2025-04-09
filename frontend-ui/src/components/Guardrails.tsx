import { useState, useEffect } from 'react';
import {
  getGuardrails,
  submitGuardrails,
} from '../services/guardrails.service';

interface GuardrailsProps {
  onClose: () => void;
}

const Guardrails = ({ onClose }: GuardrailsProps) => {
  const [guardrails, setGuardrails] = useState<string[]>([]);
  const [newGuardrail, setNewGuardrail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        const data = await getGuardrails();
        setGuardrails(data);
        setNewGuardrail('');
      } catch (err) {
        setNotification({
          type: 'error',
          message: 'Failed to fetch guardrails',
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchGuardrails();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleAddGuardrail = () => {
    if (newGuardrail.trim()) {
      setGuardrails([...guardrails, newGuardrail.trim()]);
      setNewGuardrail('');
    }
  };

  const handleDeleteGuardrail = (index: number) => {
    setGuardrails(guardrails.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setNotification(null);
    try {
      const updatedGuardrails = await submitGuardrails(guardrails);
      setGuardrails(updatedGuardrails);
      setNotification({
        type: 'success',
        message: 'Guardrails updated successfully',
      });
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to update guardrails',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="guardrails-container">
      <h2>Guardrails</h2>
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}
      {(isLoading || isSubmitting) && (
        <div className="modal-loading-overlay">
          <div className="spinner"></div>
        </div>
      )}
      <div className="guardrails-list">
        {guardrails.map((guardrail, index) => (
          <div key={index} className="guardrail-item">
            <input
              type="text"
              value={guardrail}
              onChange={(e) => {
                const newGuardrails = [...guardrails];
                newGuardrails[index] = e.target.value;
                setGuardrails(newGuardrails);
              }}
              className="guardrail-input"
              disabled={isLoading || isSubmitting}
            />
            <button
              onClick={() => handleDeleteGuardrail(index)}
              className="delete-button"
              disabled={isLoading || isSubmitting}
              title="Delete guardrail"
            >
              <svg
                className="trash-icon"
                viewBox="0 0 24 24"
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <div className="add-guardrail">
        <input
          type="text"
          value={newGuardrail}
          onChange={(e) => setNewGuardrail(e.target.value)}
          placeholder="Add new guardrail"
          className="guardrail-input"
          disabled={isLoading || isSubmitting}
        />
        <button
          onClick={handleAddGuardrail}
          className="add-button"
          disabled={isLoading || isSubmitting}
        >
          Add
        </button>
      </div>
      <div className="guardrails-actions">
        <button
          onClick={onClose}
          className="cancel-button"
          disabled={isLoading || isSubmitting}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isLoading || isSubmitting}
          className="submit-button"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

export default Guardrails;
