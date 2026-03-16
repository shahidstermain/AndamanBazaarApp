import React from 'react';
import { MessageSquare, Clock, MapPin, Phone, Check, X } from 'lucide-react';

interface QuickReplyTemplatesProps {
  onSelectTemplate: (message: string) => void;
  userRole: 'buyer' | 'seller';
  listingTitle?: string;
}

const BUYER_TEMPLATES = [
  { id: 'interested', icon: Check, text: 'Hi! I\'m interested in this item. Is it still available?' },
  { id: 'price', icon: MessageSquare, text: 'What\'s your best price for this?' },
  { id: 'meet', icon: MapPin, text: 'Where can we meet to see this?' },
  { id: 'condition', icon: MessageSquare, text: 'Can you tell me more about the condition?' },
  { id: 'photos', icon: MessageSquare, text: 'Can you share more photos?' },
  { id: 'available', icon: Clock, text: 'When are you available to meet?' },
];

const SELLER_TEMPLATES = [
  { id: 'available', icon: Check, text: 'Yes, it\'s still available!' },
  { id: 'sold', icon: X, text: 'Sorry, this has been sold.' },
  { id: 'price-firm', icon: MessageSquare, text: 'The price is firm, but we can discuss.' },
  { id: 'meet-location', icon: MapPin, text: 'We can meet at Aberdeen Bazaar or Phoenix Bay.' },
  { id: 'timing', icon: Clock, text: 'I\'m available this evening after 6 PM.' },
  { id: 'contact', icon: Phone, text: 'You can call me to discuss further.' },
];

export const QuickReplyTemplates: React.FC<QuickReplyTemplatesProps> = ({
  onSelectTemplate,
  userRole,
  listingTitle,
}) => {
  const templates = userRole === 'buyer' ? BUYER_TEMPLATES : SELLER_TEMPLATES;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-teal-600" />
        <h4 className="text-sm font-semibold text-gray-900">Quick Replies</h4>
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {templates.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => onSelectTemplate(template.text)}
              className="flex items-start gap-2 px-3 py-2 rounded-md text-sm text-left
                       bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-300
                       transition-colors duration-150"
            >
              <Icon className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700">{template.text}</span>
            </button>
          );
        })}
      </div>
      
      <p className="mt-2 text-xs text-gray-500 text-center">
        Click to insert a quick reply
      </p>
    </div>
  );
};
