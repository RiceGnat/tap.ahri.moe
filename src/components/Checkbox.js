import React from 'react';

export default ({ label, right, size, id, radio, ...others }) => <div className="field">
	<input type={radio ? 'radio' : 'checkbox'} id={id} {...others} />
	<label htmlFor={id}>
		{right && label}<span className={`check${size ? ` ${size}` : ''}`}></span>{!right && label}
	</label>
</div>