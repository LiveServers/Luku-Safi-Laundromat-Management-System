const customerFrequencyCalculator = (orders) => {
    if (orders.length === 0) return 0;
    customerFrequency = {}
    orders.sort((a,b) => new Date(b.order_date) - new Date(a.order_date)).map(order => {
      const customerId = order.customer_id;
        if(customerFrequency.hasOwnProperty(customerId)) {
            if(!customerFrequency[customerId].orderDate.includes(order.order_date.toLocaleDateString())){
            customerFrequency[customerId].customerFrequency += 1;
            customerFrequency[customerId].orderDate.push(order.order_date.toLocaleDateString());
            }
        }else{
            customerFrequency[customerId] = { 
            customerFrequency: 1, 
            customerName: order.customer_name, 
            orderDate: [order.order_date.toLocaleDateString()]
        }
        }
    });
    return customerFrequency;
}

module.exports = {
    customerFrequencyCalculator
};