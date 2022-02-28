import React from 'react';
import Checkbox from './Checkbox';
import Field from './Field';

export default ({ onChange, config }) => 
<div className="settings page">
    <div className="container">
        <h4 className="noselect">Settings</h4>
        <fieldset className="row">
            <legend className="noselect">Deck view</legend>
            <Checkbox right size="large" label="Animate foils" id="animateFoil"
                checked={config.viewer.animateFoil}
                onChange={e => onChange({ viewer: { animateFoil: e.target.checked } })} />
        </fieldset>
        <fieldset className="row">
            <legend className="noselect">Database</legend>
            <div className="flex gutter-right">
                <Field label="Key">
                    <input type="text" value={config.db.key} onChange={e => onChange({ db: { key: e.target.value } })} />
                    <div className="tip">Database {config.db.available ? 'available' : 'unavailable'}</div>
                </Field>
                <Field label="User">
                    <input type="text" value={config.db.user} onChange={e => onChange({ db: { user: e.target.value } })} />
                </Field>
            </div>
        </fieldset>
    </div>
</div>