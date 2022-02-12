create table if not exists `users` (
    id int(13) not null auto_increment,
    primary key (id)
) engine=InnoDB default charset=utf8;

create table if not exists `decks` (
    id int(13) not null,
    userId int(13) not null,
    title varchar(255),
    format varchar(255),
    description text,
    cards mediumtext,
    primary key (id),
    foreign key (userId) references users(id)
) engine=InnoDB default charset=utf8;