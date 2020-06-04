import React from 'react';
import Checkbox from './Checkbox';

export default ({ name, options, size, right, direction = 'vertical', value, onChange }) =>
	<div className={direction === 'horizontal' ? 'flex' : undefined}>
		{options.map(({ label, id }) => <Checkbox radio right={right} size={size} key={`${name}${id}`} id={id} name={name} label={label}
			checked={id === value}
			onChange={e => e.target.checked && typeof onChange === 'function' && onChange(id)}
		/>)}
	</div>