package cn.zkoss.zk4love.web.controller;

import java.util.List;

import org.zkoss.zk.ui.Component;
import org.zkoss.zk.ui.event.ForwardEvent;
import org.zkoss.zk.ui.util.GenericForwardComposer;
import org.zkoss.zkplus.databind.AnnotateDataBinder;
import org.zkoss.zkplus.databind.DataBinder;
import org.zkoss.zul.api.Row;

import cn.zkoss.zk4love.model.domain.User;
import cn.zkoss.zk4love.model.service.UserService;
import cn.zkoss.zk4love.model.service.UserServiceImpl;

public class DataBinderController extends GenericForwardComposer {
	private static final long serialVersionUID = 5529626145632732552L;
	private DataBinder dataBinder;
	private List<User> users;
	private Long totalScore = 0L;

	@Override
	public void doAfterCompose(Component comp) throws Exception {
		super.doAfterCompose(comp);
		dataBinder = new AnnotateDataBinder(comp);
		loadServiceData();
		dataBinder.loadAll();
	}

	/**
	 * 
	 * @param event
	 */
	public void onValidateScore(ForwardEvent event) {
		Row row = (Row) event.getOrigin().getTarget().getParent();
		User user = (User) row.getValue();
		System.out.println("后台user中的分数:" + user.getScore());
	}

	/**
	 */
	public void onReCalculate() {
		setTotalScore(0L);
		for (User user : users) {
			totalScore += user.getScore();
		}
		dataBinder.loadAll();
	}
	public void loadServiceData() {
		UserService userService = new UserServiceImpl();
		users = userService.listUsers();
		for (User user : users) {
			totalScore += user.getScore();
		}
	}

	public List<User> getUsers() {
		return users;
	}

	public void setUsers(List<User> users) {
		this.users = users;
	}

	public Long getTotalScore() {
		return totalScore;
	}

	public void setTotalScore(Long totalScore) {
		this.totalScore = totalScore;
	}

}
