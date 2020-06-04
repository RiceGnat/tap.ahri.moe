import React from 'react';

export default ({ className, inline, label, children }) => <div className={`field${className ? ` ${className}` : ''}`}>
	<label>
		{label}{!inline && <br />}
		{children}
	</label>
</div>