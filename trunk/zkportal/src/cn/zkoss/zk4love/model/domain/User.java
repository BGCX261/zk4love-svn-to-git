package cn.zkoss.zk4love.model.domain;

public class User {
	private String name;
	private Long score;

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public Long getScore() {
		return score;
	}

	public void setScore(Long score) {
		System.out.println("调用setScore方法，设置当前score分数为=" + score);//TODO 实际使用时删除
		this.score = score;
	}

}
