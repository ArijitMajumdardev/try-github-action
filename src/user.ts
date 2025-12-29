// ==================== DATA ====================
const users = [
  { id: 1, name: 'John Anderson', email: 'john.anderson@example.com', age: 28, city: 'New York' },
  { id: 2, name: 'Sarah Mitchell', email: 'sarah.mitchell@example.com', age: 32, city: 'Los Angeles' },
  { id: 3, name: 'Michael Thompson', email: 'michael.thompson@example.com', age: 25, city: 'Chicago' },
  { id: 4, name: 'Emily Davis', email: 'emily.davis@example.com', age: 30, city: 'New York' },
  { id: 5, name: 'Robert Wilson', email: 'robert.wilson@example.com', age: 35, city: 'Chicago' }
];

const userController = (req:any, res:any, next:any) => {
  try {
      const { city } = req.query;
      console.log(city)
    // const filteredUsers = city.length
    throw new Error("Test error");
    // const avgAge = filteredUsers.reduce((sum:any, u:any) => sum + u.age, 0) / filteredUsers.length;

    res.json({
      success: true,
      data: users,
      metadata: { count: users.length }
    });

  } catch (error) {
    next(error);
  }
}

export { userController };