import React, { useState } from 'react';
import { Sun, Moon, Monitor, Type, Palette, Zap } from 'lucide-react';

const DisplayTab: React.FC = () => {
    const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('dark');
    const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
    const [colorTheme, setColorTheme] = useState<'blue' | 'purple' | 'green' | 'red'>('blue');
    const [reducedMotion, setReducedMotion] = useState(false);
    const [highContrast, setHighContrast] = useState(false);

    const colorThemes = [
        { id: 'blue', name: 'Blue', color: '#1d9bf0' },
        { id: 'purple', name: 'Purple', color: '#7856ff' },
        { id: 'green', name: 'Green', color: '#00ba7c' },
        { id: 'red', name: 'Red', color: '#f91880' },
    ];

    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold">Display Settings</h3>

            {/* Theme Selector */}
            <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <Sun className="w-4 h-4" />
                    Theme
                </h4>
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setTheme('light')}
                        className={`p-4 rounded-lg border-2 transition-colors ${theme === 'light'
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                            }`}
                    >
                        <Sun className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Light</p>
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`p-4 rounded-lg border-2 transition-colors ${theme === 'dark'
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                            }`}
                    >
                        <Moon className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Dark</p>
                    </button>
                    <button
                        onClick={() => setTheme('auto')}
                        className={`p-4 rounded-lg border-2 transition-colors ${theme === 'auto'
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                            }`}
                    >
                        <Monitor className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-sm font-medium">Auto</p>
                    </button>
                </div>
            </div>

            <hr className="border-gray-800" />

            {/* Font Size */}
            <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Font Size
                </h4>
                <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800">
                        <input
                            type="radio"
                            name="fontSize"
                            value="small"
                            checked={fontSize === 'small'}
                            onChange={() => setFontSize('small')}
                            className="w-4 h-4 text-primary"
                        />
                        <p className="text-sm">Small</p>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800">
                        <input
                            type="radio"
                            name="fontSize"
                            value="medium"
                            checked={fontSize === 'medium'}
                            onChange={() => setFontSize('medium')}
                            className="w-4 h-4 text-primary"
                        />
                        <p className="text-base">Medium</p>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800">
                        <input
                            type="radio"
                            name="fontSize"
                            value="large"
                            checked={fontSize === 'large'}
                            onChange={() => setFontSize('large')}
                            className="w-4 h-4 text-primary"
                        />
                        <p className="text-lg">Large</p>
                    </label>
                </div>
            </div>

            <hr className="border-gray-800" />

            {/* Color Theme */}
            <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Color Theme
                </h4>
                <div className="grid grid-cols-2 gap-3">
                    {colorThemes.map((ct) => (
                        <button
                            key={ct.id}
                            onClick={() => setColorTheme(ct.id as any)}
                            className={`p-4 rounded-lg border-2 transition-colors ${colorTheme === ct.id
                                    ? 'border-primary bg-primary/10'
                                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                                }`}
                        >
                            <div
                                className="w-8 h-8 rounded-full mx-auto mb-2"
                                style={{ backgroundColor: ct.color }}
                            />
                            <p className="text-sm font-medium">{ct.name}</p>
                        </button>
                    ))}
                </div>
            </div>

            <hr className="border-gray-800" />

            {/* Accessibility */}
            <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Accessibility
                </h4>
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                        <p className="font-medium">Reduced Motion</p>
                        <p className="text-sm text-gray-500">Minimize animations and transitions</p>
                    </div>
                    <button
                        onClick={() => setReducedMotion(!reducedMotion)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${reducedMotion ? 'bg-primary' : 'bg-gray-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reducedMotion ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-900 rounded-lg">
                    <div>
                        <p className="font-medium">High Contrast Mode</p>
                        <p className="text-sm text-gray-500">Increase contrast for better visibility</p>
                    </div>
                    <button
                        onClick={() => setHighContrast(!highContrast)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${highContrast ? 'bg-primary' : 'bg-gray-700'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DisplayTab;
