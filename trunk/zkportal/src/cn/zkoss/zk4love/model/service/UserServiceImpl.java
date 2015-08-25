package cn.zkoss.zk4love.model.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import cn.zkoss.zk4love.model.domain.User;

public class UserServiceImpl implements UserService {

	@Override
	public List<User> listUsers() {
		List<User> userList = new ArrayList<User>();
		Random rand = new Random();
		for (int i = 0; i < 6; i++) {
			User user = new User();
			user.setName("张" + i);
			user.setScore(Long.valueOf(rand.nextInt(3)));
			userList.add(user);
		}
		return userList;
	}

}
