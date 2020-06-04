import React from 'react';

export default ({ label, children, ...others }) => <fieldset {...others}>
	<legend>{label}</legend>
	{children}
</fieldset>