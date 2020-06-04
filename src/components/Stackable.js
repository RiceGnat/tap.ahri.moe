import React from 'react';

export default ({ child, children }) => <div className="stackable">
	<div className="anchor">{children}</div>
	{child}
</div>